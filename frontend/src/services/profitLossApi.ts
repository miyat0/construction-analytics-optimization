import { apiClient } from "./axios";

import type { ApiSuccessResponse } from "../types/auth";
import type {
  ProfitLossDashboardData,
  ProfitLossMaterialRow,
  ProfitLossOtherRow,
  ProfitLossProjectOption,
  WorkerWageRow,
} from "../types/profitLoss";

export const listFinanceProjects = async (): Promise<ProfitLossProjectOption[]> => {
  const response = await apiClient.get<
    ApiSuccessResponse<{ results: ProfitLossProjectOption[] }>
  >("/projects/finance/projects/");
  return response.data.data.results;
};

export const fetchProfitLossDashboard = async (
  projectId: number,
  milestoneIds?: number[],
): Promise<ProfitLossDashboardData> => {
  const response = await apiClient.get<ApiSuccessResponse<ProfitLossDashboardData>>(
    `/projects/${projectId}/finance/profit-loss/`,
    {
      params:
        milestoneIds && milestoneIds.length > 0
          ? { milestone_ids: milestoneIds.join(",") }
          : undefined,
    },
  );
  return response.data.data;
};

export const updateMilestoneFinance = async (
  projectId: number,
  milestoneId: number,
  payload: { contract_value?: string; planned_cost?: string },
): Promise<void> => {
  await apiClient.patch(`/projects/${projectId}/finance/milestones/${milestoneId}/`, payload);
};

export const listWorkerWages = async (projectId: number): Promise<{
  results: WorkerWageRow[];
  default_daily_wage: string;
}> => {
  const response = await apiClient.get<
    ApiSuccessResponse<{ results: WorkerWageRow[]; default_daily_wage: string }>
  >(`/projects/${projectId}/finance/wages/`);
  return response.data.data;
};

export const saveWorkerWage = async (
  projectId: number,
  payload: { worker_id: number; daily_wage: string; hourly_rate?: string | null },
): Promise<void> => {
  await apiClient.put(`/projects/${projectId}/finance/wages/`, payload);
};

export const createMaterialExpense = async (
  projectId: number,
  payload: Record<string, unknown>,
): Promise<ProfitLossMaterialRow> => {
  const response = await apiClient.post<ApiSuccessResponse<ProfitLossMaterialRow>>(
    `/projects/${projectId}/finance/materials/`,
    payload,
  );
  return response.data.data;
};

export const deleteMaterialExpense = async (projectId: number, expenseId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/finance/materials/${expenseId}/`);
};

export const createOtherExpense = async (
  projectId: number,
  payload: Record<string, unknown>,
): Promise<ProfitLossOtherRow> => {
  const response = await apiClient.post<ApiSuccessResponse<ProfitLossOtherRow>>(
    `/projects/${projectId}/finance/other-expenses/`,
    payload,
  );
  return response.data.data;
};

export const deleteOtherExpense = async (projectId: number, expenseId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/finance/other-expenses/${expenseId}/`);
};
