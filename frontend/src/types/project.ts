import type { ApiSuccessResponse, RoleDetails } from "./auth";

export const PROJECT_STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
] as const;

export const MILESTONE_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
] as const;

export const MILESTONE_TASK_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
  { value: "on_hold", label: "On Hold" },
] as const;

export const TASK_UPDATE_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
] as const;

export const INCOMPLETE_WORK_REASON_OPTIONS = [
  { value: "material_unavailable", label: "Material unavailable" },
  { value: "equipment_unavailable", label: "Equipment unavailable" },
  { value: "safety_issue", label: "Safety issue" },
  { value: "insufficient_manpower", label: "Insufficient manpower" },
  { value: "weather", label: "Weather" },
  { value: "technical_issue", label: "Technical issue" },
  { value: "other", label: "Other" },
] as const;

export const TASK_REVIEW_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const SCHEDULE_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "ahead_of_schedule", label: "Ahead of Schedule" },
  { value: "on_schedule", label: "On Schedule" },
  { value: "behind_schedule", label: "Behind Schedule" },
  { value: "completed", label: "Completed" },
] as const;

export const PROJECT_DOCUMENT_TYPE_OPTIONS = [
  { value: "project_cost", label: "Project Cost" },
  { value: "engineering_drawing", label: "Engineering Drawing" },
  { value: "contract", label: "Contract" },
  { value: "report", label: "Report" },
  { value: "permit", label: "Permit" },
  { value: "other", label: "Other" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number]["value"];
export type MilestoneStatus = (typeof MILESTONE_STATUS_OPTIONS)[number]["value"];
export type MilestoneTaskStatus = (typeof MILESTONE_TASK_STATUS_OPTIONS)[number]["value"];
export type TaskUpdateStatus = (typeof TASK_UPDATE_STATUS_OPTIONS)[number]["value"];
export type IncompleteWorkReason = (typeof INCOMPLETE_WORK_REASON_OPTIONS)[number]["value"];
export type TaskReviewStatus = (typeof TASK_REVIEW_STATUS_OPTIONS)[number]["value"];
export type ScheduleStatus = (typeof SCHEDULE_STATUS_OPTIONS)[number]["value"];
export type ProjectDocumentType = (typeof PROJECT_DOCUMENT_TYPE_OPTIONS)[number]["value"];

export interface ProjectUserSummary {
  user_id: number;
  name: string;
  email: string;
  role: RoleDetails;
}

export interface ProjectLookupUser {
  user_id: number;
  name: string;
  email: string;
  role_name: string;
}

export interface ProjectSummary {
  project_id: number;
  project_name: string;
  description: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  initial_budget: string;
  is_archived: boolean;
  created_by: ProjectUserSummary | null;
  project_manager: ProjectUserSummary | null;
  client: ProjectUserSummary | null;
  /** @deprecated Prefer site_engineers — kept for backward compatibility. */
  site_engineer: ProjectUserSummary | null;
  /** @deprecated Prefer supervisors — kept for backward compatibility. */
  supervisor: ProjectUserSummary | null;
  site_engineers: ProjectUserSummary[];
  supervisors: ProjectUserSummary[];
  milestone_count: number;
  document_count: number;
  progress_percentage: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {}

export interface ProjectListData {
  count: number;
  results: ProjectSummary[];
}

export interface ProjectLookupData {
  project_managers: ProjectLookupUser[];
  clients: ProjectLookupUser[];
  site_engineers: ProjectLookupUser[];
  supervisors: ProjectLookupUser[];
  workers: ProjectLookupUser[];
}

export interface ProjectPayload {
  project_name: string;
  description: string;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  initial_budget?: string;
  project_manager_id?: number | null;
  client_id?: number | null;
  /** @deprecated Prefer site_engineer_ids. */
  site_engineer_id?: number | null;
  /** @deprecated Prefer supervisor_ids. */
  supervisor_id?: number | null;
  site_engineer_ids?: number[];
  supervisor_ids?: number[];
}

export interface ProjectUpdatePayload extends Partial<ProjectPayload> {}

export interface Milestone {
  milestone_id: number;
  project_id: number;
  title: string;
  description: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  revised_end_date: string | null;
  effective_end_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  task_count: number;
  extension_count: number;
  progress_percentage: string;
  expected_progress_percentage: string;
  schedule_status?: ScheduleStatus;
  schedule_status_label?: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneListData {
  count: number;
  results: Milestone[];
}

export interface MilestonePayload {
  title: string;
  description: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  revised_end_date?: string | null;
  status: MilestoneStatus;
  sort_order?: number;
}

export interface MilestoneExtension {
  extension_id: number;
  previous_end_date: string | null;
  new_end_date: string;
  reason: string;
  extended_by: ProjectUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneExtensionListData {
  count: number;
  results: MilestoneExtension[];
}

export interface MilestoneExtensionPayload {
  new_end_date: string;
  reason?: string;
}

export interface TaskMilestoneSummary {
  milestone_id: number;
  project_id: number;
  title: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  revised_end_date: string | null;
  effective_end_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
}

export interface DailyTaskUpdateManHourContext {
  worker_man_hours_for_date: string;
  required_workers: number;
  planned_man_hours: string | null;
  actual_man_hours: string;
  manpower_utilization_percentage: string | null;
}

export interface DailyTaskUpdate {
  update_id: number;
  assignment_id: number;
  task_id: number;
  task_title: string;
  milestone_id: number;
  milestone_title: string;
  project_id: number;
  project_name: string;
  work_date: string;
  completion_percentage: string;
  status: TaskUpdateStatus;
  remark: string;
  concern_text: string;
  incomplete_reason: IncompleteWorkReason | "";
  incomplete_reason_detail: string;
  has_safety_issue: boolean;
  concern_resolved: boolean;
  concern_resolved_at: string | null;
  concern_resolved_by: ProjectUserSummary | null;
  supervisor_review_status: TaskReviewStatus;
  supervisor_review_note: string;
  supervisor_reviewed_at: string | null;
  supervisor_reviewed_by: ProjectUserSummary | null;
  engineer_review_status: TaskReviewStatus;
  engineer_review_note: string;
  engineer_reviewed_at: string | null;
  engineer_reviewed_by: ProjectUserSummary | null;
  man_hour_context?: DailyTaskUpdateManHourContext | null;
  worker: ProjectUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignmentTaskSummary {
  task_id: number;
  title: string;
  status: MilestoneTaskStatus;
  required_worker_count: number;
  milestone_id: number;
  milestone_title: string;
  project_id: number;
  project_name: string;
}

export interface TaskAssignment {
  assignment_id: number;
  worker: ProjectUserSummary | null;
  assigned_by: ProjectUserSummary | null;
  duty_instructions: string;
  is_active: boolean;
  latest_update: DailyTaskUpdate | null;
  updates: DailyTaskUpdate[];
  task: TaskAssignmentTaskSummary;
  created_at: string;
  updated_at: string;
}

export interface MilestoneTask {
  task_id: number;
  project_id: number;
  milestone: TaskMilestoneSummary;
  title: string;
  description: string;
  expected_work: string;
  completion_requirement: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  required_worker_count: number;
  planned_duration_days: number | null;
  planned_hours_per_day: string | null;
  planned_man_hours: string | null;
  actual_man_hours: string;
  manpower_utilization_percentage: string | null;
  daily_target_percentage: string | null;
  status: MilestoneTaskStatus;
  sort_order: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: ProjectUserSummary | null;
  approval_note: string;
  progress_percentage: string;
  expected_progress_percentage: string;
  schedule_status?: ScheduleStatus;
  schedule_status_label?: string;
  active_assignment_count: number;
  active_assignments: TaskAssignment[];
  created_by: ProjectUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneTaskListData {
  count: number;
  results: MilestoneTask[];
}

export interface MilestoneTaskPayload {
  title: string;
  description?: string;
  expected_work?: string;
  completion_requirement?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  required_worker_count?: number;
  planned_duration_days?: number | null;
  planned_hours_per_day?: string | number | null;
  daily_target_percentage?: string | number | null;
  status?: MilestoneTaskStatus;
  sort_order?: number;
}

export interface TaskAssignmentListData {
  count: number;
  results: TaskAssignment[];
}

export interface TaskWorkerAssignmentPayload {
  worker_id: number;
  duty_instructions?: string;
  is_active?: boolean;
}

export interface DailyTaskUpdateListData {
  count: number;
  results: DailyTaskUpdate[];
}

export interface DailyTaskUpdatePayload {
  work_date?: string;
  completion_percentage: string;
  status: TaskUpdateStatus;
  remark?: string;
  concern_text?: string;
  incomplete_reason?: IncompleteWorkReason | "";
  incomplete_reason_detail?: string;
  has_safety_issue?: boolean;
}

export interface DailyTaskReviewPayload {
  review_status: Exclude<TaskReviewStatus, "pending">;
  review_note?: string;
}

export interface ProjectDocument {
  document_id: number;
  project_id: number;
  milestone_id: number | null;
  milestone_title: string | null;
  title: string;
  document_type: ProjectDocumentType;
  description: string;
  is_client_visible: boolean;
  file_name: string | null;
  file_url: string | null;
  uploaded_by: ProjectUserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocumentListData {
  count: number;
  results: ProjectDocument[];
}

export interface WorkerLookupListData {
  count: number;
  results: ProjectLookupUser[];
}

export type WorkplaceNeedCategory =
  | "safety"
  | "tools_equipment"
  | "ppe"
  | "workplace_facilities"
  | "transportation"
  | "accommodation"
  | "working_conditions"
  | "other";

export type WorkplaceNeedPriority = "low" | "medium" | "high" | "urgent";

export type WorkplaceNeedStatus =
  | "submitted"
  | "under_supervisor_review"
  | "verified"
  | "forwarded_to_pm"
  | "in_progress"
  | "resolved"
  | "rejected";

export interface WorkplaceNeedAttachment {
  attachment_id: number;
  file_url: string | null;
  original_name: string;
  created_at: string;
}

export interface WorkplaceNeed {
  request_id: number;
  tracking_code: string;
  project_id: number;
  project_name: string;
  milestone_id: number | null;
  milestone_title: string | null;
  submitted_by: ProjectUserSummary;
  category: WorkplaceNeedCategory;
  category_label: string;
  description: string;
  priority: WorkplaceNeedPriority;
  priority_label: string;
  status: WorkplaceNeedStatus;
  status_label: string;
  submitted_at: string;
  supervisor_remarks: string;
  supervisor_reviewed_by: ProjectUserSummary | null;
  supervisor_reviewed_at: string | null;
  pm_comments: string;
  pm_reviewed_by: ProjectUserSummary | null;
  pm_reviewed_at: string | null;
  resolved_at: string | null;
  attachments: WorkplaceNeedAttachment[];
  created_at: string;
  updated_at: string;
}

export interface WorkplaceNeedListData {
  results: WorkplaceNeed[];
}

export interface WorkplaceNeedContextMilestone {
  milestone_id: number;
  title: string;
}

export interface WorkplaceNeedContextProject {
  project_id: number;
  project_name: string;
  milestones: WorkplaceNeedContextMilestone[];
}

export interface WorkplaceNeedContextData {
  results: WorkplaceNeedContextProject[];
}

export interface WorkplaceNeedSupervisorReviewPayload {
  action: "verify" | "reject";
  remarks?: string;
}

export interface WorkplaceNeedPmActionPayload {
  action: "start" | "resolve" | "comment";
  comments?: string;
}

export type ProjectListResponse = ApiSuccessResponse<ProjectListData>;
export type ProjectDetailResponse = ApiSuccessResponse<ProjectDetail>;
export type ProjectLookupResponse = ApiSuccessResponse<ProjectLookupData>;
export type MilestoneListResponse = ApiSuccessResponse<MilestoneListData>;
export type MilestoneExtensionListResponse = ApiSuccessResponse<MilestoneExtensionListData>;
export type MilestoneTaskListResponse = ApiSuccessResponse<MilestoneTaskListData>;
export type TaskAssignmentListResponse = ApiSuccessResponse<TaskAssignmentListData>;
export type DailyTaskUpdateListResponse = ApiSuccessResponse<DailyTaskUpdateListData>;
export type ProjectDocumentListResponse = ApiSuccessResponse<ProjectDocumentListData>;
export type WorkerLookupListResponse = ApiSuccessResponse<WorkerLookupListData>;
