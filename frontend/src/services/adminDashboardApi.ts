import { apiClient } from "./axios";

import type { AdminDashboardData } from "../types/adminDashboard";
import type { ApiSuccessResponse } from "../types/auth";

export const fetchAdminDashboard = async (): Promise<AdminDashboardData> => {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardData>>(
    "/projects/admin-dashboard/",
  );
  return response.data.data;
};
