'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProjectWithStats, Project } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProjectModal } from '@/components/ProjectModal';
import { formatDateTime } from '@/lib/utils';
import {
  Layers,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Search,
} from 'lucide-react';

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const json = await res.json();
      if (json.data) {
        setProjects(json.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Overall workspace stats
  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.stats?.total_tasks || 0), 0);
  const totalCompleted = projects.reduce((acc, p) => acc + (p.stats?.completed_tasks || 0), 0);
  const totalOverdue = projects.reduce((acc, p) => acc + (p.stats?.overdue_tasks || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onNewProject={() => setIsModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Hero / Summary */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Developer Workspace
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Real-time project tracking, Kanban workflows, and audit-grade activity logging.
          </p>
        </div>

        {/* Global Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Projects</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {totalProjects}
            </div>
            <div className="text-xs text-slate-400 mt-1">Active workspaces</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {totalTasks}
            </div>
            <div className="text-xs text-slate-400 mt-1">Across all boards</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalCompleted}
            </div>
            <div className="text-xs text-slate-400 mt-1">Tasks resolved</div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {totalOverdue}
            </div>
            <div className="text-xs text-slate-400 mt-1">Requiring immediate attention</div>
          </div>
        </div>

        {/* Project List Header & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>All Projects</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {filteredProjects.length}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>
        </div>

        {/* Projects Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-900/40 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
            <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              {search ? 'No matching projects found' : 'No projects created yet'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              {search ? 'Try adjusting your search criteria.' : 'Create your first project to start organizing tasks on an interactive Kanban board.'}
            </p>
            {!search && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const stats = project.stats || {
                total_tasks: 0,
                completed_tasks: 0,
                in_progress_tasks: 0,
                overdue_tasks: 0,
                completion_percentage: 0,
              };

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {project.name}
                      </h3>
                      {stats.overdue_tasks > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {stats.overdue_tasks} overdue
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="text-slate-900 dark:text-white font-bold">{stats.completion_percentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                          style={{ width: `${stats.completion_percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span title="Total Tasks">{stats.total_tasks} tasks</span>
                        <span>•</span>
                        <span title="In Progress">{stats.in_progress_tasks} active</span>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                        <span>Board</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newProject) => {
          fetchProjects();
        }}
      />
    </div>
  );
}
