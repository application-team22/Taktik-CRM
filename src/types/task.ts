export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  client_id: string;
  description: string;
  due_date: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskFormData {
  client_id: string;
  description: string;
  due_date: string;
  status: TaskStatus;
}
