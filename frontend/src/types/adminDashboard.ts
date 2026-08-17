export interface DashboardKpis {
  active_projects: number;
  on_schedule_projects: number;
  milestones_due_soon: number;
  milestones_in_progress: number;
  portfolio_budget: string;
  active_budget: string;
  total_projects: number;
  planning_projects: number;
  completed_projects: number;
  on_hold_projects: number;
}

export interface DashboardBudgetChartPoint {
  label: string;
  value: number;
}

export interface DashboardBudgetOverview {
  total_allocated: string;
  active_allocated: string;
  completed_allocated: string;
  on_hold_allocated: string;
  planning_allocated: string;
  note: string;
  chart: DashboardBudgetChartPoint[];
}

export interface DashboardProjectRow {
  project_id: number;
  project_name: string;
  status: string;
  health: string;
  health_key: string;
  progress_percentage: number;
  expected_progress_percentage: number;
  initial_budget: string;
  milestone_count: number;
  delayed_milestone_count: number;
  project_manager: { user_id: number; name: string } | null;
  end_date: string | null;
  attention_reasons: string[];
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface DashboardRoleCount {
  role_id: number;
  role_name: string;
  count: number;
}

export interface DashboardTeamOverview {
  total_users: number;
  active_users: number;
  roles: DashboardRoleCount[];
}

export interface DashboardRecentUser {
  user_id: number;
  name: string;
  email: string;
  role_name: string;
  status: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface DashboardUpcomingMilestone {
  milestone_id: number;
  title: string;
  project_id: number;
  project_name: string;
  due_date: string;
  days_until_due: number;
  status: string;
}

export interface AdminDashboardData {
  generated_at: string;
  kpis: DashboardKpis;
  budget_overview: DashboardBudgetOverview;
  project_performance: DashboardProjectRow[];
  attention_projects: DashboardProjectRow[];
  recent_activity: DashboardActivityItem[];
  upcoming_milestones: DashboardUpcomingMilestone[];
  team: DashboardTeamOverview;
  recent_users: DashboardRecentUser[];
}
