-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Statuses table (per-project configurable workflow)
create table if not exists statuses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  order_index int not null,
  color text default '#64748b',
  created_at timestamptz not null default now(),
  constraint unique_project_status_order unique (project_id, order_index)
);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status_id uuid not null references statuses(id) on delete restrict,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tags table (global reusable tags)
create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  created_at timestamptz not null default now()
);

-- Task Tags join table (many-to-many)
create table if not exists task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- Activity timeline table (server-side logged)
create table if not exists activity (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete set null,
  project_id uuid not null references projects(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  description text,
  created_at timestamptz not null default now()
);

-- Notes table
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for high performance
create index if not exists idx_statuses_project on statuses(project_id, order_index);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_status on tasks(status_id);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_activity_project on activity(project_id, created_at desc);
create index if not exists idx_activity_task on activity(task_id, created_at desc);
create index if not exists idx_notes_project on notes(project_id, created_at desc);

-- ROW LEVEL SECURITY (RLS)
-- Lock down all tables so no anonymous or public access is permitted.
-- All operations run strictly server-side via Next.js Route Handlers using the Supabase Service Role Key.
alter table projects enable row level security;
alter table statuses enable row level security;
alter table tasks enable row level security;
alter table tags enable row level security;
alter table task_tags enable row level security;
alter table activity enable row level security;
alter table notes enable row level security;

-- Deny all policies for public/anon
-- (Service role key bypasses RLS automatically in Postgres / Supabase)
