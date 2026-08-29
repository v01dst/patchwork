/**
 * In-memory Supabase mock shared by the reliability tests.
 * Simulates the atomic RPC behavior (single-transaction semantics: a failing
 * step throws and the caller's simulated tables are only committed on success),
 * plus FK constraints and cross-project status validation.
 */
function createMockDb(initial = {}) {
  const state = {
    projects: [...(initial.projects || [])],
    statuses: [...(initial.statuses || [])],
    tasks: [...(initial.tasks || [])],
    tags: [...(initial.tags || [])],
    task_tags: [...(initial.task_tags || [])],
    activity: [...(initial.activity || [])],
    notes: [...(initial.notes || [])],
  };

  // Deep clone on snapshot/commit so rollback restores prior state exactly.
  const snapshot = () => JSON.parse(JSON.stringify(state));
  let committed = snapshot();

  const db = {
    state,
    commit() { committed = snapshot(); },
    rollback() { Object.assign(state, JSON.parse(JSON.stringify(committed))); },

    // ---- RPC functions mirroring supabase/migrations/20260829120000_atomic_rpc.sql ----
    rpc(fn, args) {
      try {
        const result = db.fns[fn](args);
        db.commit(); // whole RPC succeeded -> commit the transaction
        return { data: result, error: null };
      } catch (err) {
        db.rollback(); // any failure rolls back EVERYTHING (atomic semantics)
        return { data: null, error: { message: String(err.message || err) } };
      }
    },

    fns: {
      create_project_with_statuses({ p_name, p_description, p_statuses }) {
        if (!p_name || !String(p_name).trim()) throw new Error('INVALID_NAME');
        const project = {
          id: 'proj-' + (state.projects.length + 1),
          name: String(p_name).trim(),
          description: p_description ? String(p_description).trim() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.projects.push(project);
        // Seed default statuses (same defaults as lib/constants.ts).
        (p_statuses || []).forEach((s) => {
          state.statuses.push({
            id: 'st-' + (state.statuses.length + 1),
            project_id: project.id,
            name: s.name,
            order_index: s.order_index,
            color: s.color,
          });
        });
        return project;
      },

      create_task_atomic({ p_project_id, p_task, p_tags, p_activity }) {
        const status = state.statuses.find(
          (s) => s.id === p_task.status_id && s.project_id === p_project_id
        );
        if (!status) throw new Error('INVALID_STATUS_FOR_PROJECT');
        if (
          p_task.priority &&
          !['low', 'medium', 'high', 'urgent'].includes(p_task.priority)
        ) {
          throw new Error('INVALID_PRIORITY');
        }
        const task = {
          id: 'task-' + (state.tasks.length + 1),
          project_id: p_project_id,
          title: String(p_task.title || '').trim(),
          description: p_task.description || null,
          status_id: p_task.status_id,
          priority: p_task.priority || 'medium',
          assignee: p_task.assignee || null,
          due_date: p_task.due_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.tasks.push(task);

        // Atomic tag upsert + link (mirrors the SQL).
        const names = (p_tags || [])
          .filter((t) => typeof t === 'string')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        const unique = [...new Set(names)];
        unique.forEach((name) => {
          if (!state.tags.some((g) => g.name === name)) {
            state.tags.push({ id: 'tag-' + (state.tags.length + 1), name });
          }
        });
        unique.forEach((name) => {
          const tag = state.tags.find((g) => g.name === name);
          state.task_tags.push({ task_id: task.id, tag_id: tag.id });
        });

        const proj = state.projects.find((p) => p.id === p_project_id);
        if (proj) proj.updated_at = new Date().toISOString();

        if (p_activity) {
          state.activity.push({
            id: 'act-' + (state.activity.length + 1),
            task_id: task.id,
            project_id: p_project_id,
            ...p_activity,
            created_at: new Date().toISOString(),
          });
        }
        return task.id;
      },

      update_task_atomic({ p_task_id, p_updates, p_activities, p_tags, p_tags_provided }) {
        const task = state.tasks.find((t) => t.id === p_task_id);
        if (!task) throw new Error('TASK_NOT_FOUND');
        if (
          p_updates.status_id &&
          !state.statuses.some(
            (s) => s.id === p_updates.status_id && s.project_id === task.project_id
          )
        ) {
          throw new Error('INVALID_STATUS_FOR_PROJECT');
        }
        Object.assign(task, { updated_at: new Date().toISOString() }, p_updates);
        if (p_tags_provided) {
          state.task_tags = state.task_tags.filter((tt) => tt.task_id !== p_task_id);
          const unique = [
            ...new Set(
              (p_tags || [])
                .filter((t) => typeof t === 'string')
                .map((t) => t.trim().toLowerCase())
            ),
          ].filter(Boolean);
          unique.forEach((name) => {
            if (!state.tags.some((g) => g.name === name)) {
              state.tags.push({ id: 'tag-' + (state.tags.length + 1), name });
            }
          });
          unique.forEach((name) => {
            const tag = state.tags.find((g) => g.name === name);
            state.task_tags.push({ task_id: p_task_id, tag_id: tag.id });
          });
        }
        const proj = state.projects.find((p) => p.id === task.project_id);
        if (proj) proj.updated_at = new Date().toISOString();
        (p_activities || []).forEach((a) => {
          state.activity.push({
            id: 'act-' + (state.activity.length + 1),
            task_id: p_task_id,
            project_id: task.project_id,
            ...a,
            created_at: new Date().toISOString(),
          });
        });
        return p_task_id;
      },

      delete_task_atomic({ p_task_id, p_activity }) {
        const task = state.tasks.find((t) => t.id === p_task_id);
        if (!task) return true; // idempotent
        if (p_activity) {
          state.activity.push({
            id: 'act-' + (state.activity.length + 1),
            task_id: null,
            project_id: task.project_id,
            ...p_activity,
            created_at: new Date().toISOString(),
          });
        }
        state.tasks = state.tasks.filter((t) => t.id !== p_task_id);
        state.task_tags = state.task_tags.filter((tt) => tt.task_id !== p_task_id);
        const proj = state.projects.find((p) => p.id === task.project_id);
        if (proj) proj.updated_at = new Date().toISOString();
        return true;
      },

      reorder_statuses({ p_project_id, p_ordered_ids }) {
        const mine = state.statuses.filter((s) => s.project_id === p_project_id);
        if (!p_ordered_ids || p_ordered_ids.length === 0 || p_ordered_ids.length !== mine.length) {
          throw new Error('REORDER_MISMATCH');
        }
        if (
          p_ordered_ids.some(
            (id) => !state.statuses.some((s) => s.id === id && s.project_id === p_project_id)
          )
        ) {
          throw new Error('INVALID_STATUS_FOR_PROJECT');
        }
        p_ordered_ids.forEach((id, i) => {
          const st = state.statuses.find((s) => s.id === id);
          st.order_index = i;
        });
        return state.statuses
          .filter((s) => s.project_id === p_project_id)
          .sort((a, b) => a.order_index - b.order_index);
      },

      delete_status_atomic({ p_status_id, p_project_id }) {
        const mine = state.statuses.filter((s) => s.project_id === p_project_id);
        if (mine.length <= 1) throw new Error('CANNOT_DELETE_LAST_STATUS');
        if (!state.statuses.some((s) => s.id === p_status_id && s.project_id === p_project_id)) {
          throw new Error('STATUS_NOT_FOUND');
        }
        const fallback = mine
          .filter((s) => s.id !== p_status_id)
          .sort((a, b) => a.order_index - b.order_index)[0];
        state.tasks.forEach((t) => {
          if (t.status_id === p_status_id) t.status_id = fallback.id;
        });
        state.statuses = state.statuses.filter((s) => s.id !== p_status_id);
        const remaining = state.statuses
          .filter((s) => s.project_id === p_project_id)
          .sort((a, b) => a.order_index - b.order_index);
        remaining.forEach((s, i) => (s.order_index = i));
        return remaining;
      },

      create_note_atomic({ p_project_id, p_content }) {
        if (!p_content || !String(p_content).trim()) throw new Error('INVALID_CONTENT');
        const note = {
          id: 'note-' + (state.notes.length + 1),
          project_id: p_project_id,
          content: String(p_content).trim(),
          created_at: new Date().toISOString(),
        };
        state.notes.push(note);
        const proj = state.projects.find((p) => p.id === p_project_id);
        if (proj) proj.updated_at = new Date().toISOString();
        return note;
      },
    },
  };

  return db;
}

module.exports = { createMockDb };
