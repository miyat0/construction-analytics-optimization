import { apiClient } from "./axios";

import type { ApiSuccessResponse } from "../types/auth";
import type {
  CreateUserPayload,
  ManagedUser,
  ManagedUserListData,
  UpdateUserPayload,
  UserListQuery,
} from "../types/userManagement";

const buildUserParams = (query: UserListQuery = {}) => {
  return {
    ...(query.search ? { search: query.search } : {}),
    ...(query.role_id ? { role_id: query.role_id } : {}),
  };
};

export const listUsers = async (
  query: UserListQuery = {},
): Promise<ManagedUserListData> => {
  const response = await apiClient.get<ApiSuccessResponse<ManagedUserListData>>(
    "/users/",
    {
      params: buildUserParams(query),
    },
  );

  return response.data.data;
};

export const getUser = async (userId: number): Promise<ManagedUser> => {
  const response = await apiClient.get<ApiSuccessResponse<ManagedUser>>(
    `/users/${userId}/`,
  );

  return response.data.data;
};

export const createUser = async (
  payload: CreateUserPayload,
): Promise<ManagedUser> => {
  const response = await apiClient.post<ApiSuccessResponse<ManagedUser>>(
    "/users/",
    payload,
  );

  return response.data.data;
};

export const updateUser = async (
  userId: number,
  payload: UpdateUserPayload,
): Promise<ManagedUser> => {
  const response = await apiClient.put<ApiSuccessResponse<ManagedUser>>(
    `/users/${userId}/`,
    payload,
  );

  return response.data.data;
};

export const deleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/users/${userId}/`);
};

export const activateUser = async (userId: number): Promise<ManagedUser> => {
  const response = await apiClient.patch<ApiSuccessResponse<ManagedUser>>(
    `/users/${userId}/activate/`,
  );

  return response.data.data;
};

export const deactivateUser = async (userId: number): Promise<ManagedUser> => {
  const response = await apiClient.patch<ApiSuccessResponse<ManagedUser>>(
    `/users/${userId}/deactivate/`,
  );

  return response.data.data;
};
