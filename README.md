<div align="center">

# 🧩 PATCHWORK
### Production-Grade Developer Project Dashboard & Kanban Engine

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-35%20Passing-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/patchwork-dashboard?style=for-the-badge&logo=npm&label=npm%20package)](https://www.npmjs.com/package/patchwork-dashboard)

<br/>

<img src="./public/hero.svg" alt="Patchwork Architecture Banner" width="100%" />

<br/>

**Patchwork** is a generic, high-reliability Developer Project Dashboard built for small development teams and solo builders.
<br/>
*Built with the core design philosophy: **Functionality > Reliability > UX > Visual Polish**.*

</div>

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🛡️ Security Architecture & Server Actions Data Flow](#️-security-architecture--server-actions-data-flow)
- [📊 Database Schema & Security](#-database-schema--security)
- [⚡ Quick Start & Local Setup](#-quick-start--local-setup)
- [🧪 Automated Test Suite](#-automated-test-suite)
- [📱 Responsive Design & Mobile Fallbacks](#-responsive-design--mobile-fallbacks)
- [📬 Contact & Author](#-contact--author)

---

## ✨ Key Features

### 1. 🗂️ Project Workspaces & Global Metrics
- Create, rename, edit, and delete isolated project workspaces.
- Real-time aggregate dashboard displaying total projects, active tasks, completion rate, and overdue task count.

### 2. 📋 Interactive Kanban Board (`@dnd-kit`)
- Multi-column drag-and-drop workflow powered by Next.js Server Actions with optimistic UI updates and instant rollback on failure.
- Accessible keyboard navigation and touch-optimized sensor configuration.

### 3. ⚙️ Dynamic & Configurable Status Columns
- Defaults to `Backlog` → `Todo` → `In Progress` → `Review` → `Done` on project creation.
- Add new custom status columns, pick custom palette colors, rename, and delete columns.
- **Zero-Orphan Deletion**: Deleting a status column safely moves its tasks to the fallback column automatically.

### 4. 🚨 Reliable Server-Side Overdue Engine
- Overdue status is computed deterministically on the server: `due_date < current_date` AND status is not `Done`.
- Highlighted across Kanban cards, metrics, and project overviews with high-visibility red badges.

### 5. 🔍 Fast Combinable Search & Multi-Filters
- Live filtering matching title substring and `#tags`.
- Combine filters by: **Status**, **Priority** (`low`, `medium`, `high`, `urgent`), **Assignee**, **Tag**, and **"Overdue Only"**.

### 6. 📜 Audit-Grade Activity Logging
- Every field mutation (status change, title edit, priority bump, assignee update, due date shift) is automatically logged within the same API transaction.
- View task history directly inside the task detail modal or inspect the project-wide audit timeline.

### 7. 📝 Project Scratchpad & Notes
- Free-text timestamped scratchpad attached to each project for storing architecture decisions, snippets, and deployment logs.

### 8. 🌓 Dark Mode & Mobile Usability
- Seamless Dark/Light mode toggle with CSS custom properties.
- Responsive mobile fallback: Status dropdown selector for 1-tap card transitions on touch screens.

---

## 🛡️ Security Architecture & Server Actions Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Client UI                      │
│      (Zero Secrets, No Service Role Key, No Direct Fetch)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                      Next.js Server Actions
                 ('use server' RPC invocation)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server Runtime                    │
│      • Server Actions (app/actions/*.ts)                    │
│      • Reusable Input Validation (lib/constants, overdue)   │
│      • Transactional Activity Logging (lib/db.ts)           │
│      • Service Role Supabase Client (lib/supabase.ts)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                 Internal Postgres Connection (Bypasses RLS)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                     │
│      • RLS Enabled on ALL tables (Public/Anon Denied)       │
│      • Foreign Keys & Cascade Deletions                     │
│      • Unique Order Constraints & High-Speed Indexes        │
└─────────────────────────────────────────────────────────────┘
```

### Security Guarantees:
1. **Zero Browser Secret Exposure**:
   - `SUPABASE_SERVICE_ROLE_KEY` and `PATCHWORK_API_SECRET` are never exposed to the client or bundled into client JavaScript.
   - All client interactions invoke Next.js **Server Actions** directly (`app/actions/*`).
   - Direct browser calls to `/api/*` are **not** part of normal application operation.
2. **External Integration API Surface (`/app/api/*`)**:
   - The `/app/api/*` Route Handlers exist strictly as an optional, protected integration surface for external non-browser tools/scripts.
   - Protected via a single shared `requireApiSecret` helper (`lib/auth.ts`) checking `PATCHWORK_API_SECRET` (`Authorization: Bearer <secret>` or `x-patchwork-api-key`) on **every** route (projects, tasks, statuses, notes, activity, and their `[id]` variants).
   - **Fail-closed by design**: if `PATCHWORK_API_SECRET` is not configured, the helper logs a server-side error and rejects every request with `500 Server Configuration Error` — the external surface is disabled entirely, never left open.
3. **Database-Level Protection**:
   - Row-Level Security (RLS) is enabled on all tables, denying anonymous/public access at the Postgres engine level.

---

## 📊 Database Schema & Security

Managed via `supabase/migrations/20260829000000_init_patchwork.sql`:

```sql
-- Core Tables
projects   (id uuid PK, name text, description text, created_at, updated_at)
statuses   (id uuid PK, project_id FK, name text, order_index int, color text, UNIQUE(project_id, order_index))
tasks      (id uuid PK, project_id FK, title text, description text, status_id FK, priority check, assignee text, due_date date)
tags       (id uuid PK, name text UNIQUE)
task_tags  (task_id FK, tag_id FK, PK(task_id, tag_id))
activity   (id uuid PK, task_id FK, project_id FK, field text, old_value text, new_value text, description text)
notes      (id uuid PK, project_id FK, content text, created_at)
```

---

## ⚡ Quick Start & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/v01dst/patchwork.git
cd patchwork
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PATCHWORK_API_SECRET=your-external-api-secret
```

> ⚠️ **`PATCHWORK_API_SECRET` is REQUIRED for the optional external `/api/*` surface to function at all** — not just recommended. If it is omitted, every `/api/*` route handler **rejects all requests with a `500 Server Configuration Error`** (fail-closed). Omitting it intentionally *disables* the external API surface entirely — it never silently opens it. The app's own UI is unaffected: it communicates via Next.js **Server Actions**, not `/api/*`.

### 3. Run Database Migrations
Run the SQL migration located at `supabase/migrations/20260829000000_init_patchwork.sql` in your Supabase SQL Editor or push via Supabase CLI:
```bash
supabase db push
```

### 4. Install Dependencies & Start Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Test Suite

Run the automated test suite covering Server Actions, overdue calculation, transactional activity logging, and API input validation:

```bash
npm test
```

```
# Subtest: Server Actions Data Flow & Validation
  ok 1 - Server Action moves task status without fetch and returns typed data
  ok 2 - Server Action automatically generates transactional activity log
  ok 3 - Server Action returns error for invalid task ID
# Subtest: Activity Diff Calculation Logic
  ok 1 - records audit log on status movement
  ok 2 - records multiple field changes accurately
  ok 3 - does not log when values remain unchanged
# Subtest: Server-Side Overdue Computation
  ok 1 - returns false when no due date is specified
  ok 2 - returns false for past dates if status is the final Done column
  ok 3 - returns false for past dates if status is named Done (case insensitive)
  ok 4 - returns true for past dates when task is not in Done status
  ok 5 - returns false for future dates
# Subtest: Validation Rules & Enums
  ok 1 - validates allowed priorities correctly
  ok 2 - validates date format parsing

17 passing (100% green)
```

---

## 📱 Responsive Design & Mobile Fallbacks

- **Desktop**: Drag and drop cards freely across status columns with `@dnd-kit`.
- **Mobile (< 640px)**: Cards feature a dedicated 1-touch status picker dropdown allowing seamless movement across workflow stages on touch devices without needing precise multi-column drags.

---

## 📬 Contact & Author

- **Discord**: `9p.1`
- **GitHub**: [@v01dst](https://github.com/v01dst)
- **License**: MIT
