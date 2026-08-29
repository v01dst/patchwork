-- ATOMIC MULTI-STEP MUTATIONS (reliability fix, QA round 1)
-- Supabase JS client calls are independent HTTP requests and CANNOT share a
-- client-side transaction. Every multi-step logical operation is therefore
-- folded into ONE Postgres function executed in a single transaction:
-- any failure partway rolls back ALL writes (no partial/orphaned data).

-- 1) Project creation + default status seed (atomic)
create or replace function create_project_with_statuses(p_name text, p_description text, p_statuses jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_project projects;
  v_status jsonb;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'INVALID_NAME';
  end if;

  insert into projects (name, description)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''))
  returning * into v_project;

  for v_status in select * from jsonb_array_elements(p_statuses)
  loop
    insert into statuses (project_id, name, order_index, color)
    values (v_project.id, v_status->>'name', (v_status->>'order_index')::int, coalesce(v_status->>'color', '#64748b'));
  end loop;

  return row_to_json(v_project);
end;
$$;

-- 2) Task creation: insert task + upsert/link tags + bump project + activity (atomic)
create or replace function create_task_atomic(
  p_project_id uuid,
  p_task jsonb,
  p_tags text[] default null,
  p_activity jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  v_task_id uuid;
begin
  -- Validation: status must exist AND belong to the task's own project.
  if not exists (
    select 1 from statuses s
    where s.id = (p_task->>'status_id')::uuid and s.project_id = p_project_id
  ) then
    raise exception 'INVALID_STATUS_FOR_PROJECT';
  end if;

  if p_task->>'priority' is not null
     and p_task->>'priority' not in ('low', 'medium', 'high', 'urgent') then
    raise exception 'INVALID_PRIORITY';
  end if;

  insert into tasks (project_id, title, description, status_id, priority, assignee, due_date, updated_at)
  values (
    p_project_id,
    btrim(p_task->>'title'),
    nullif(p_task->>'description', ''),
    (p_task->>'status_id')::uuid,
    coalesce(p_task->>'priority', 'medium'),
    nullif(p_task->>'assignee', ''),
    nullif(p_task->>'due_date', '')::date,
    now()
  )
  returning id into v_task_id;

  if p_tags is not null and array_length(p_tags, 1) > 0 then
    insert into tags (name)
    select lower(btrim(t)) from unnest(p_tags) t where btrim(t) <> ''
    on conflict (name) do nothing;

    insert into task_tags (task_id, tag_id)
    select v_task_id, g.id
    from (select lower(btrim(t)) as name from unnest(p_tags) t where btrim(t) <> '') n
    join tags g on g.name = n.name;
  end if;

  update projects set updated_at = now() where id = p_project_id;

  if p_activity is not null then
    insert into activity (task_id, project_id, field, old_value, new_value, description)
    values (
      v_task_id, p_project_id,
      p_activity->>'field', p_activity->>'old_value',
      p_activity->>'new_value', p_activity->>'description'
    );
  end if;

  return (select row_to_json(t) from tasks t where t.id = v_task_id);
end;
$$;

-- 3) Task update: field diff + tag resync + project bump + activity rows (atomic)
create or replace function update_task_atomic(
  p_task_id uuid,
  p_updates jsonb,
  p_activities jsonb default '[]'::jsonb,
  p_tags text[] default null,
  p_tags_provided boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  v_project_id uuid;
  v_act jsonb;
begin
  select project_id into v_project_id from tasks where id = p_task_id for update;
  if v_project_id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if p_updates ? 'status_id' then
    if not exists (
      select 1 from statuses s
      where s.id = (p_updates->>'status_id')::uuid and s.project_id = v_project_id
    ) then
      raise exception 'INVALID_STATUS_FOR_PROJECT';
    end if;
  end if;

  update tasks set
    title = coalesce(p_updates->>'title', title),
    description = case when p_updates ? 'description' then nullif(p_updates->>'description', '') else description end,
    status_id = coalesce((p_updates->>'status_id')::uuid, status_id),
    priority = coalesce(p_updates->>'priority', priority),
    assignee = case when p_updates ? 'assignee' then nullif(p_updates->>'assignee', '') else assignee end,
    due_date = case when p_updates ? 'due_date' then nullif(p_updates->>'due_date', '')::date else due_date end,
    updated_at = now()
  where id = p_task_id;

  if p_tags_provided then
    delete from task_tags where task_id = p_task_id;
    if p_tags is not null and array_length(p_tags, 1) > 0 then
      insert into tags (name)
      select lower(btrim(t)) from unnest(p_tags) t where btrim(t) <> ''
      on conflict (name) do nothing;

      insert into task_tags (task_id, tag_id)
      select p_task_id, g.id
      from (select lower(btrim(t)) as name from unnest(p_tags) t where btrim(t) <> '') n
      join tags g on g.name = n.name;
    end if;
  end if;

  update projects set updated_at = now() where id = v_project_id;

  for v_act in select * from jsonb_array_elements(coalesce(p_activities, '[]'::jsonb))
  loop
    insert into activity (task_id, project_id, field, old_value, new_value, description)
    values (
      p_task_id, v_project_id,
      v_act->>'field', v_act->>'old_value',
      v_act->>'new_value', v_act->>'description'
    );
  end loop;

  return (select row_to_json(t) from tasks t where t.id = p_task_id);
end;
$$;

-- 4) Task deletion: activity log + delete + project bump (atomic)
create or replace function delete_task_atomic(p_task_id uuid, p_activity jsonb)
returns boolean
language plpgsql
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from tasks where id = p_task_id;
  if v_project_id is null then
    return true; -- idempotent: deleting a non-existent task is a no-op
  end if;

  if p_activity is not null then
    insert into activity (task_id, project_id, field, old_value, new_value, description)
    values (
      null, v_project_id,
      p_activity->>'field', p_activity->>'old_value',
      p_activity->>'new_value', p_activity->>'description'
    );
  end if;

  delete from tasks where id = p_task_id;
  update projects set updated_at = now() where id = v_project_id;
  return true;
end;
$$;

-- 5) Status reorder: two-phase reindex inside ONE transaction
--    (phase 1 parks all indexes at a 10000+ offset, phase 2 assigns 0..n-1;
--     any interruption rolls back to the original order)
create or replace function reorder_statuses(p_project_id uuid, p_ordered_ids uuid[])
returns jsonb
language plpgsql
as $$
declare
  v_count int;
  v_provided int;
  v_i int;
begin
  select count(*) into v_count from statuses where project_id = p_project_id;
  v_provided := coalesce(array_length(p_ordered_ids, 1), 0);

  if v_provided = 0 or v_provided <> v_count then
    raise exception 'REORDER_MISMATCH';
  end if;

  if exists (
    select 1 from unnest(p_ordered_ids) u(id)
    where not exists (
      select 1 from statuses s where s.id = u.id and s.project_id = p_project_id
    )
  ) then
    raise exception 'INVALID_STATUS_FOR_PROJECT';
  end if;

  for v_i in 1..v_provided loop
    update statuses set order_index = 10000 + v_i
    where id = p_ordered_ids[v_i] and project_id = p_project_id;
  end loop;

  for v_i in 1..v_provided loop
    update statuses set order_index = v_i - 1
    where id = p_ordered_ids[v_i] and project_id = p_project_id;
  end loop;

  return coalesce(
    (select jsonb_agg(row_to_json(s) order by s.order_index)
     from statuses s where s.project_id = p_project_id),
    '[]'::jsonb
  );
end;
$$;

-- 6) Status deletion: task reassignment to fallback + delete + reindex (atomic)
create or replace function delete_status_atomic(p_status_id uuid, p_project_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_count int;
  v_fallback uuid;
begin
  select count(*) into v_count from statuses where project_id = p_project_id;
  if v_count <= 1 then
    raise exception 'CANNOT_DELETE_LAST_STATUS';
  end if;

  if not exists (select 1 from statuses where id = p_status_id and project_id = p_project_id) then
    raise exception 'STATUS_NOT_FOUND';
  end if;

  -- Safe fallback: first remaining status by current order.
  select id into v_fallback from statuses
  where project_id = p_project_id and id <> p_status_id
  order by order_index asc
  limit 1;

  update tasks set status_id = v_fallback, updated_at = now() where status_id = p_status_id;
  delete from statuses where id = p_status_id;

  perform reorder_statuses(
    p_project_id,
    (select array_agg(id order by order_index asc) from statuses where project_id = p_project_id)
  );

  return coalesce(
    (select jsonb_agg(row_to_json(s) order by s.order_index)
     from statuses s where s.project_id = p_project_id),
    '[]'::jsonb
  );
end;
$$;

-- 7) Note creation + project bump (atomic)
create or replace function create_note_atomic(p_project_id uuid, p_content text)
returns jsonb
language plpgsql
as $$
declare
  v_note notes;
begin
  if p_content is null or btrim(p_content) = '' then
    raise exception 'INVALID_CONTENT';
  end if;

  insert into notes (project_id, content)
  values (p_project_id, btrim(p_content))
  returning * into v_note;

  update projects set updated_at = now() where id = p_project_id;
  return row_to_json(v_note);
end;
$$;
