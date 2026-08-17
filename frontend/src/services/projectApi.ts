import { apiClient } from "./axios";

import type {
  DailyTaskReviewPayload,
  DailyTaskUpdate,
  DailyTaskUpdateListData,
  DailyTaskUpdatePayload,
  Milestone,
  MilestoneExtension,
  MilestoneExtensionListData,
  MilestoneExtensionPayload,
  MilestoneListData,
  MilestonePayload,
  MilestoneTask,
  MilestoneTaskListData,
  MilestoneTaskPayload,
  ProjectDetail,
  ProjectDocument,
  ProjectDocumentListData,
  ProjectListData,
  ProjectLookupData,
  ProjectLookupUser,
  ProjectPayload,
  ProjectUpdatePayload,
  TaskAssignment,
  TaskAssignmentListData,
  TaskWorkerAssignmentPayload,
  WorkerLookupListData,
} from "../types/project";
import type { ApiSuccessResponse } from "../types/auth";

const multipartHeaders = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

export const listProjects = async (): Promise<ProjectListData> => {
  const response = await apiClient.get<ApiSuccessResponse<ProjectListData>>("/projects/");
  return response.data.data;
};

export const fetchProjectLookups = async (): Promise<ProjectLookupData> => {
  const response = await apiClient.get<ApiSuccessResponse<ProjectLookupData>>(
    "/projects/lookups/",
  );
  return response.data.data;
};

export const getProject = async (projectId: number): Promise<ProjectDetail> => {
  const response = await apiClient.get<ApiSuccessResponse<ProjectDetail>>(
    `/projects/${projectId}/`,
  );
  return response.data.data;
};

export const createProject = async (payload: ProjectPayload): Promise<ProjectDetail> => {
  const response = await apiClient.post<ApiSuccessResponse<ProjectDetail>>(
    "/projects/",
    payload,
  );
  return response.data.data;
};

export const updateProject = async (
  projectId: number,
  payload: ProjectUpdatePayload,
): Promise<ProjectDetail> => {
  const response = await apiClient.patch<ApiSuccessResponse<ProjectDetail>>(
    `/projects/${projectId}/`,
    payload,
  );
  return response.data.data;
};

export const archiveProject = async (projectId: number): Promise<ProjectDetail> => {
  const response = await apiClient.post<ApiSuccessResponse<ProjectDetail>>(
    `/projects/${projectId}/archive/`,
  );
  return response.data.data;
};

export const deleteProject = async (projectId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/`);
};

export const listProjectMilestones = async (
  projectId: number,
): Promise<MilestoneListData> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneListData>>(
    `/projects/${projectId}/milestones/`,
  );
  return response.data.data;
};

export const createProjectMilestone = async (
  projectId: number,
  payload: MilestonePayload,
): Promise<Milestone> => {
  const response = await apiClient.post<ApiSuccessResponse<Milestone>>(
    `/projects/${projectId}/milestones/`,
    payload,
  );
  return response.data.data;
};

export const updateProjectMilestone = async (
  projectId: number,
  milestoneId: number,
  payload: Partial<MilestonePayload>,
): Promise<Milestone> => {
  const response = await apiClient.patch<ApiSuccessResponse<Milestone>>(
    `/projects/${projectId}/milestones/${milestoneId}/`,
    payload,
  );
  return response.data.data;
};

export const deleteProjectMilestone = async (
  projectId: number,
  milestoneId: number,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/milestones/${milestoneId}/`);
};

export const listMilestoneExtensions = async (
  projectId: number,
  milestoneId: number,
): Promise<MilestoneExtensionListData> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneExtensionListData>>(
    `/projects/${projectId}/milestones/${milestoneId}/extensions/`,
  );
  return response.data.data;
};

export const createMilestoneExtension = async (
  projectId: number,
  milestoneId: number,
  payload: MilestoneExtensionPayload,
): Promise<MilestoneExtension> => {
  const response = await apiClient.post<ApiSuccessResponse<MilestoneExtension>>(
    `/projects/${projectId}/milestones/${milestoneId}/extensions/`,
    payload,
  );
  return response.data.data;
};

export const getMilestoneExtension = async (
  projectId: number,
  milestoneId: number,
  extensionId: number,
): Promise<MilestoneExtension> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneExtension>>(
    `/projects/${projectId}/milestones/${milestoneId}/extensions/${extensionId}/`,
  );
  return response.data.data;
};

export const updateMilestoneExtension = async (
  projectId: number,
  milestoneId: number,
  extensionId: number,
  payload: Partial<MilestoneExtensionPayload>,
): Promise<MilestoneExtension> => {
  const response = await apiClient.patch<ApiSuccessResponse<MilestoneExtension>>(
    `/projects/${projectId}/milestones/${milestoneId}/extensions/${extensionId}/`,
    payload,
  );
  return response.data.data;
};

export const deleteMilestoneExtension = async (
  projectId: number,
  milestoneId: number,
  extensionId: number,
): Promise<void> => {
  await apiClient.delete(
    `/projects/${projectId}/milestones/${milestoneId}/extensions/${extensionId}/`,
  );
};

export const listMilestoneTasks = async (
  projectId: number,
  milestoneId: number,
): Promise<MilestoneTaskListData> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneTaskListData>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/`,
  );
  return response.data.data;
};

export const createMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  payload: MilestoneTaskPayload,
): Promise<MilestoneTask> => {
  const response = await apiClient.post<ApiSuccessResponse<MilestoneTask>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/`,
    payload,
  );
  return response.data.data;
};

export const getMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
): Promise<MilestoneTask> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneTask>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/`,
  );
  return response.data.data;
};

export interface TaskManpowerSummary {
  task_id: number;
  required_workers: number;
  planned_duration_days: number | null;
  planned_hours_per_day: string | null;
  planned_man_hours: string | null;
  actual_man_hours: string;
  manpower_utilization_percentage: string | null;
  completion_percentage: string;
}

export const getTaskManpowerSummary = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
): Promise<TaskManpowerSummary> => {
  const response = await apiClient.get<ApiSuccessResponse<TaskManpowerSummary>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/manpower-summary/`,
  );
  return response.data.data;
};

export const updateMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  payload: Partial<MilestoneTaskPayload>,
): Promise<MilestoneTask> => {
  const response = await apiClient.patch<ApiSuccessResponse<MilestoneTask>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/`,
    payload,
  );
  return response.data.data;
};

export const deleteMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/`);
};

export const approveMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  approval_note = "",
): Promise<MilestoneTask> => {
  const response = await apiClient.post<ApiSuccessResponse<MilestoneTask>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/approve/`,
    { approval_note },
  );
  return response.data.data;
};

export const rejectMilestoneTask = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  approval_note = "",
): Promise<MilestoneTask> => {
  const response = await apiClient.post<ApiSuccessResponse<MilestoneTask>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/reject/`,
    { approval_note },
  );
  return response.data.data;
};

export const listPendingApprovalTasks = async (
  projectId: number,
): Promise<MilestoneTaskListData> => {
  const response = await apiClient.get<ApiSuccessResponse<MilestoneTaskListData>>(
    `/projects/${projectId}/pending-tasks/`,
  );
  return response.data.data;
};

export const listProjectDailyUpdates = async (
  projectId: number,
): Promise<DailyTaskUpdateListData> => {
  const response = await apiClient.get<ApiSuccessResponse<DailyTaskUpdateListData>>(
    `/projects/${projectId}/daily-updates/`,
  );
  return response.data.data;
};

export const resolveProjectConcern = async (
  projectId: number,
  updateId: number,
  resolved: boolean,
): Promise<DailyTaskUpdate> => {
  const response = await apiClient.post<ApiSuccessResponse<DailyTaskUpdate>>(
    `/projects/${projectId}/concerns/${updateId}/resolve/`,
    { resolved },
  );
  return response.data.data;
};

export const listProjectWorkers = async (
  projectId: number,
): Promise<WorkerLookupListData> => {
  const response = await apiClient.get<ApiSuccessResponse<WorkerLookupListData>>(
    `/projects/${projectId}/team-workers/`,
  );
  return response.data.data;
};

export const listTaskAssignments = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
): Promise<TaskAssignmentListData> => {
  const response = await apiClient.get<ApiSuccessResponse<TaskAssignmentListData>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/assignments/`,
  );
  return response.data.data;
};

export const createTaskAssignment = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  payload: TaskWorkerAssignmentPayload,
): Promise<TaskAssignment> => {
  const response = await apiClient.post<ApiSuccessResponse<TaskAssignment>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/assignments/`,
    payload,
  );
  return response.data.data;
};

export const updateTaskAssignment = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  assignmentId: number,
  payload: Partial<TaskWorkerAssignmentPayload>,
): Promise<TaskAssignment> => {
  const response = await apiClient.patch<ApiSuccessResponse<TaskAssignment>>(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/assignments/${assignmentId}/`,
    payload,
  );
  return response.data.data;
};

export const deleteTaskAssignment = async (
  projectId: number,
  milestoneId: number,
  taskId: number,
  assignmentId: number,
): Promise<void> => {
  await apiClient.delete(
    `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/assignments/${assignmentId}/`,
  );
};

export const listTaskAssignmentUpdates = async (
  assignmentId: number,
): Promise<DailyTaskUpdateListData> => {
  const response = await apiClient.get<ApiSuccessResponse<DailyTaskUpdateListData>>(
    `/projects/task-assignments/${assignmentId}/updates/`,
  );
  return response.data.data;
};

export const createTaskAssignmentUpdate = async (
  assignmentId: number,
  payload: DailyTaskUpdatePayload,
): Promise<DailyTaskUpdate> => {
  const response = await apiClient.post<ApiSuccessResponse<DailyTaskUpdate>>(
    `/projects/task-assignments/${assignmentId}/updates/`,
    payload,
  );
  return response.data.data;
};

export const reviewTaskUpdateBySupervisor = async (
  updateId: number,
  payload: DailyTaskReviewPayload,
): Promise<DailyTaskUpdate> => {
  const response = await apiClient.post<ApiSuccessResponse<DailyTaskUpdate>>(
    `/projects/task-updates/${updateId}/supervisor-review/`,
    payload,
  );
  return response.data.data;
};

export const reviewTaskUpdateByEngineer = async (
  updateId: number,
  payload: DailyTaskReviewPayload,
): Promise<DailyTaskUpdate> => {
  const response = await apiClient.post<ApiSuccessResponse<DailyTaskUpdate>>(
    `/projects/task-updates/${updateId}/engineer-review/`,
    payload,
  );
  return response.data.data;
};

export const listMyTaskAssignments = async (): Promise<TaskAssignmentListData> => {
  const response = await apiClient.get<ApiSuccessResponse<TaskAssignmentListData>>(
    "/projects/my-task-assignments/",
  );
  return response.data.data;
};

export const listProjectConcerns = async (
  projectId: number,
): Promise<DailyTaskUpdateListData> => {
  const response = await apiClient.get<ApiSuccessResponse<DailyTaskUpdateListData>>(
    `/projects/${projectId}/concerns/`,
  );
  return response.data.data;
};

export const listProjectDocuments = async (
  projectId: number,
): Promise<ProjectDocumentListData> => {
  const response = await apiClient.get<ApiSuccessResponse<ProjectDocumentListData>>(
    `/projects/${projectId}/documents/`,
  );
  return response.data.data;
};

export const createProjectDocument = async (
  projectId: number,
  payload: FormData,
): Promise<ProjectDocument> => {
  const response = await apiClient.post<ApiSuccessResponse<ProjectDocument>>(
    `/projects/${projectId}/documents/`,
    payload,
    multipartHeaders,
  );
  return response.data.data;
};

export const updateProjectDocument = async (
  projectId: number,
  documentId: number,
  payload: FormData,
): Promise<ProjectDocument> => {
  const response = await apiClient.patch<ApiSuccessResponse<ProjectDocument>>(
    `/projects/${projectId}/documents/${documentId}/`,
    payload,
    multipartHeaders,
  );
  return response.data.data;
};

export const deleteProjectDocument = async (
  projectId: number,
  documentId: number,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/documents/${documentId}/`);
};

export const hydrateTaskAssignmentsFromTasks = (
  tasks: MilestoneTask[],
): TaskAssignment[] => {
  return tasks.flatMap((task) => task.active_assignments);
};

export const collectTaskUpdatesFromAssignments = (
  assignments: TaskAssignment[],
): DailyTaskUpdate[] => {
  return assignments.flatMap((assignment) => assignment.updates);
};

export const getProjectWorkerOptions = async (
  projectId: number,
): Promise<ProjectLookupUser[]> => {
  const data = await listProjectWorkers(projectId);
  return data.results;
};
