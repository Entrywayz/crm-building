export type UserRole = 'manager' | 'worker';

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'accepted' | 'revision';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  created_by: string | null;
  created_at: string;
  tasks_count?: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assignee_id: string;
  author_id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  // Joins
  assignee?: Profile;
  author?: Profile;
  project?: Project;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  changed_by: string;
  comment: string | null;
  created_at: string;
  changed_by_profile?: Profile;
}
