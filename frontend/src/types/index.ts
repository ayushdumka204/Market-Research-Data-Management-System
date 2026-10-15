export type Role = "admin" | "leader" | "team";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
}
export interface Project {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  status: "planning" | "ongoing" | "on_hold" | "completed";
  start_date: string | null;
  due_date: string | null;
  sample_target: number;
  sample_completed: number;
  leader_id: string | null;
  leader_name?: string | null;
  task_count?: number;
  approved_tasks?: number;
}
export interface Survey {
  id: string;
  project_id: string;
  project_name?: string;
  survey_name: string;
  source: string | null;
  response_target: number;
  response_count: number;
  status: string;
  notes: string | null;
  created_at?: string;
}
export interface DataRecord {
  id: string;
  project_id: string;
  project_name?: string;
  record_name: string;
  record_type: string;
  record_count: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}
export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  assigned_to: string;
  assigned_name?: string;
  title: string;
  description: string | null;
  status: string;
  work_date: string | null;
  due_date: string | null;
  completed_count: number;
  update_note: string | null;
  leader_feedback: string | null;
  created_at?: string;
}
export interface ApiError {
  message: string;
}
