export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team";
};
export type Project = {
  id: string;
  name: string;
  client: string;
  industry: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "active" | "completed" | "on_hold";
  created_at: string;
  response_count?: number;
};
export type ResponseRecord = {
  id: string;
  project_id: string;
  project_name?: string;
  respondent_code: string;
  response_date: string;
  channel: string;
  answers: Record<string, unknown> | string;
  notes: string;
  created_at: string;
};
export type DashboardStats = {
  total_projects: number;
  active_projects: number;
  total_responses: number;
  completed_projects: number;
  recent_projects: Project[];
  recent_responses: ResponseRecord[];
};
