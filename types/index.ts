export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_percentage: number;
}

export interface ProjectWithStats extends Project {
  stats: ProjectStats;
}

export interface Status {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  color: string;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status_id: string;
  priority: Priority;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  tags?: Tag[];
  status?: Status;
  is_overdue?: boolean;
}

export interface Activity {
  id: string;
  task_id: string | null;
  project_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
}
