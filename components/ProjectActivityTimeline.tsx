'use client';

import React, { useState, useEffect } from 'react';
import { Activity } from '@/types';
import { Clock, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ProjectActivityTimelineProps {
  projectId: string;
}

export function ProjectActivityTimeline({ projectId }: ProjectActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      const json = await res.json();
      if (json.data) setActivities(json.data);
    } catch (err) {
      console.error('Failed to load project activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Project Activity Audit</h3>
        </div>
        <button
          onClick={fetchActivities}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
          title="Refresh audit log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Loading audit log...</div>
        ) : activities.length === 0 ? (
          <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center italic">
            No logged activity yet. Changes made to tasks will appear here automatically.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
            {activities.map(act => (
              <div key={act.id} className="relative group">
                <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                <div className="text-[11px] text-slate-400 mb-0.5">
                  {formatDateTime(act.created_at)}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  {act.description || `Updated field ${act.field}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
