# Patchwork Database Schema

This document details the PostgreSQL schema managed via Supabase migrations (`supabase/migrations/20260829000000_init_patchwork.sql`).

---

## Tables Overview

### 1. `projects`
Stores high-level developer projects/workspaces.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `name` (`text`, NOT NULL): Name of the project.
- `description` (`text`, Nullable): Summary description of the project.
- `created_at` (`timestamptz`, default `now()`)
- `updated_at` (`timestamptz`, default `now()`)

### 2. `statuses`
Represents customizable columns on the Kanban board per project.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `project_id` (`uuid`, NOT NULL, FK references `projects(id)` on delete cascade)
- `name` (`text`, NOT NULL): Status title (e.g. *Backlog*, *Todo*, *In Progress*, *Review*, *Done*).
- `order_index` (`int`, NOT NULL): Visual order sequence.
- `color` (`text`, default `#64748b`): Hex color code for UI badges and markers.
- `created_at` (`timestamptz`, default `now()`)
- **Constraints**: `UNIQUE (project_id, order_index)`

### 3. `tasks`
Individual tasks scoped to a project and assigned to a status column.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `project_id` (`uuid`, NOT NULL, FK references `projects(id)` on delete cascade)
- `title` (`text`, NOT NULL): Task headline / title.
- `description` (`text`, Nullable): Markdown or plain-text details.
- `status_id` (`uuid`, NOT NULL, FK references `statuses(id)` on delete restrict)
- `priority` (`text`, NOT NULL, default `'medium'`): Checked in `('low', 'medium', 'high', 'urgent')`.
- `assignee` (`text`, Nullable): Free-text assignee name (no login/auth accounts in v1).
- `due_date` (`date`, Nullable): Target completion date (YYYY-MM-DD).
- `created_at` (`timestamptz`, default `now()`)
- `updated_at` (`timestamptz`, default `now()`)

### 4. `tags`
Global reusable taxonomy tags.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `name` (`text`, UNIQUE, NOT NULL): Tag name (lowercased, trimmed).
- `created_at` (`timestamptz`, default `now()`)

### 5. `task_tags`
Many-to-Many join table linking `tasks` and `tags`.
- `task_id` (`uuid`, NOT NULL, FK references `tasks(id)` on delete cascade)
- `tag_id` (`uuid`, NOT NULL, FK references `tags(id)` on delete cascade)
- **Primary Key**: `(task_id, tag_id)`

### 6. `activity`
Immutable server-side audit log tracking every meaningful mutation.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `task_id` (`uuid`, Nullable, FK references `tasks(id)` on delete set null)
- `project_id` (`uuid`, NOT NULL, FK references `projects(id)` on delete cascade)
- `field` (`text`, NOT NULL): Field name changed (`status`, `priority`, `assignee`, `due_date`, `title`, `description`, `created`, `deleted`).
- `old_value` (`text`, Nullable)
- `new_value` (`text`, Nullable)
- `description` (`text`, Nullable): Human-readable summary of the mutation.
- `created_at` (`timestamptz`, default `now()`)

### 7. `notes`
Free-text timestamped notes and scratchpad entries for each project.
- `id` (`uuid`, Primary Key, `default uuid_generate_v4()`)
- `project_id` (`uuid`, NOT NULL, FK references `projects(id)` on delete cascade)
- `content` (`text`, NOT NULL)
- `created_at` (`timestamptz`, default `now()`)

---

## Security & Row Level Security (RLS)

All tables have Row Level Security enabled:
```sql
alter table projects enable row level security;
alter table statuses enable row level security;
alter table tasks enable row level security;
alter table tags enable row level security;
alter table task_tags enable row level security;
alter table activity enable row level security;
alter table notes enable row level security;
```
All direct public/anon access is denied by default. All data access occurs securely via Next.js Route Handlers using the Supabase Service Role Key on the server.
