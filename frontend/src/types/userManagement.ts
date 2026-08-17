import type { UserRoleName } from "./auth";

export interface RoleOption {
  role_id: number;
  role_name: UserRoleName;
  description: string;
}

export interface RoleListData {
  count: number;
  results: RoleOption[];
}

export interface ManagedUser {
  user_id: number;
  login_id: number | null;
  name: string;
  email: string;
  login_email: string | null;
  phone_number: string;
  status: string;
  is_active: boolean;
  has_login_account: boolean;
  role: RoleOption;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagedUserListData {
  count: number;
  results: ManagedUser[];
}

export interface UserListQuery {
  search?: string;
  role_id?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  phone_number: string;
  role_id: number;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone_number?: string;
  role_id?: number;
  password?: string;
}

export interface UserFormValues {
  name: string;
  email: string;
  phone_number: string;
  role_id?: number;
  password: string;
}
