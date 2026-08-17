import { apiClient } from "./axios";

import type { ApiSuccessResponse } from "../types/auth";
import type { RoleListData } from "../types/userManagement";

export const fetchRoles = async (): Promise<RoleListData> => {
  const response = await apiClient.get<ApiSuccessResponse<RoleListData>>("/roles/");
  return response.data.data;
};
