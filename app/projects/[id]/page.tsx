'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectWithStats, Status, Task, Priority } from '@/types';
import { Navbar } from '@/components/Navbar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskModal } from '@/components/TaskModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { StatusModal } from '@/components/StatusModal';
import { ProjectModal } from '@/components/ProjectModal';
import { NotesPanel } from '@/components/NotesPanel';
import { ProjectActivityTimeline } from '@/components/ProjectActivityTimeline';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Layers,
  ArrowLeft,
  X,
} from 'lucide-react';

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const router = useRouter();

  // State
  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatusIdForNewTask, setDefaultStatusIdForNewTask] = useState<string | undefined>();
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Active Tab: Kanban vs Notes / Activity
  const [activeView, setActiveView] = useState<'board' | 'notes' | 'activity'>('board');

  const fetchProjectData = async () => {
    try {
      const [pRes, sRes, tRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/statuses`),
        fetch(`/api/projects/${projectId}/tasks`),
      ]);

      const [pJson, sJson, tJson] = await Promise.all([
        pRes.json(),
        sRes.json(),
        tRes.json(),
      ]);

      if (pJson.data) setProject(pJson.data);
      if (sJson.data) setStatuses(sJson.data);
      if (tJson.data) setTasks(tJson.data);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Handle Drag & Drop / Mobile status move with Optimistic UI update + server confirmation and rollback
  const handleTaskMove = async (taskId: string, targetStatusId: string) => {
    const originalTasks = [...tasks];
    const targetStatus = statuses.find(s => s.id === targetStatusId);

    // Optimistic Update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status_id: targetStatusId, status: targetStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: targetStatusId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to update task status');
      }

      // Update with server confirmed task & refresh project stats
      setTasks(prev => prev.map(t => (t.id === taskId ? json.data : t)));
      fetchProjectData();
    } catch (err: any) {
      console.error('Rollback status change:', err);
      // Rollback on failure
      setTasks(originalTasks);
      alert(`Could not move task: ${err.message}`);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      fetchProjectData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Delete Status
  const handleDeleteStatus = async (statusId: string) => {
    if (statuses.length <= 1) {
      alert('You must have at least one status column.');
      return;
    }

    if (confirm('Deleting this status column will safely move its tasks to the fallback status column. Proceed?')) {
      try {
        const res = await fetch(`/api/statuses/${statusId}?projectId=${projectId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchProjectData();
        } else {
          const json = await res.json();
          alert(json.message || 'Failed to delete status');
        }
      } catch (err) {
        console.error('Failed to delete status:', err);
      }
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (confirm(`Are you sure you want to completely delete project "${project?.name}" and all its tasks?`)) {
      try {
        await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        router.push('/');
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  // Collect unique assignees and tags for filters
  const allAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[];
  const allTags = Array.from(
    new Set(tasks.flatMap(t => (t.tags || []).map(tag => tag.name)))
  );

  // Filter Tasks Combinably
  const filteredTasks = tasks.filter(task => {
    // Search matching title or tags
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchTags = (task.tags || []).some(t => t.name.toLowerCase().includes(q));
      if (!matchTitle && !matchTags) return false;
    }

    // Status filter
    if (selectedStatus !== 'ALL' && task.status_id !== selectedStatus) return false;

    // Priority filter
    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) return false;

    // Assignee filter
    if (selectedAssignee !== 'ALL' && task.assignee !== selectedAssignee) return false;

    // Tag filter
    if (selectedTag !== 'ALL' && !(task.tags || []).some(t => t.name === selectedTag)) return false;

    // Overdue toggle
    if (overdueOnly && !task.is_overdue) return false;

    return true;
  });

  const stats = project?.stats || {
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    completion_percentage: 0,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title={project?.name || 'Project'} showBack={true} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Header Overview Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {project?.name}
                </h1>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Edit Project Details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {project?.description || 'No description provided.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5">
                <span className="text-xs text-slate-400 block">Progress</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.completion_percentage}%
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5">
                <span className="text-xs text-slate-400 block">In Progress</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {stats.in_progress_tasks}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2.5">
                <span className="text-xs text-slate-400 block">Overdue</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats.overdue_tasks}
                </span>
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setDefaultStatusIdForNewTask(statuses[0]?.id);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveView('board')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeView === 'board'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setActiveView('notes')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeView === 'notes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Notes & Scratchpad
            </button>
            <button
              onClick={() => setActiveView('activity')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                activeView === 'activity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Activity Audit Log
            </button>
          </div>
        </div>

        {/* TAB 1: KANBAN BOARD */}
        {activeView === 'board' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Fast search task titles and #tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                  >
                    <option value="ALL">All Statuses</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {/* Priority */}
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden capitalize"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  {/* Assignee */}
                  {allAssignees.length > 0 && (
                    <select
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                    >
                      <option value="ALL">All Assignees</option>
                      {allAssignees.map(a => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Tag */}
                  {allTags.length > 0 && (
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                    >
                      <option value="ALL">All Tags</option>
                      {allTags.map(tag => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Overdue Only Toggle */}
                  <button
                    onClick={() => setOverdueOnly(!overdueOnly)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      overdueOnly
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Overdue Only</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kanban Board Container */}
            <KanbanBoard
              statuses={statuses}
              tasks={filteredTasks}
              onTaskMove={handleTaskMove}
              onAddTask={(statusId) => {
                setEditingTask(null);
                setDefaultStatusIdForNewTask(statusId);
                setIsTaskModalOpen(true);
              }}
              onTaskClick={(task) => setDetailTask(task)}
              onEditStatus={(status) => {
                setEditingStatus(status);
                setIsStatusModalOpen(true);
              }}
              onDeleteStatus={handleDeleteStatus}
              onAddStatus={() => {
                setEditingStatus(null);
                setIsStatusModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB 2: NOTES */}
        {activeView === 'notes' && (
          <div className="max-w-3xl mx-auto">
            <NotesPanel projectId={projectId} />
          </div>
        )}

        {/* TAB 3: AUDIT TIMELINE */}
        {activeView === 'activity' && (
          <div className="max-w-3xl mx-auto">
            <ProjectActivityTimeline projectId={projectId} />
          </div>
        )}
      </main>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={(task) => {
          fetchProjectData();
        }}
        projectId={projectId}
        statuses={statuses}
        initialData={editingTask}
        defaultStatusId={defaultStatusIdForNewTask}
      />

      {/* Task Details & Activity View */}
      <TaskDetailModal
        task={detailTask}
        statuses={statuses}
        isOpen={!!detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => {
          setDetailTask(null);
          setEditingTask(task);
          setIsTaskModalOpen(true);
        }}
        onDelete={(taskId) => {
          handleDeleteTask(taskId);
        }}
      />

      {/* Status Create / Edit Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={() => {
          fetchProjectData();
        }}
        projectId={projectId}
        initialData={editingStatus}
      />

      {/* Project Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => {
          fetchProjectData();
        }}
        initialData={project}
      />
    </div>
  );
}
