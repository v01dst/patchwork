'use client';

import React, { useState, useEffect } from 'react';
import { Note } from '@/types';
import { StickyNote, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface NotesPanelProps {
  projectId: string;
}

export function NotesPanel({ projectId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`);
      const json = await res.json();
      if (json.data) setNotes(json.data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.data) {
        setNotes([json.data, ...notes]);
        setContent('');
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Project Scratchpad & Notes</h3>
      </div>

      <form onSubmit={handleAddNote} className="mb-5">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Jot down quick thoughts, meeting snippets, deployment keys, architecture decisions..."
          className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Add Note</span>
          </button>
        </div>
      </form>

      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-xs text-slate-400 py-4 text-center">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center italic">
            No notes yet. Use this area for unstructured team scratchpad thoughts.
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              className="group p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 relative hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateTime(note.created_at)}
                </span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition p-1"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
