import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import AddUserModal from "../../components/admin/AddUserModal";
import UserForm from "../../components/admin/UserForm";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar, PageToolbar } from "../../components/ui/PageToolbar";
import {
  getAdminPeoplePath,
  getAdminPeopleRoleBySlug,
} from "../../config/adminPeople";
import { ROLE_NAMES } from "../../types/auth";
import { fetchRoles } from "../../services/roleApi";
import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "../../services/userManagementApi";

import type {
  ManagedUser,
  ManagedUserListData,
  RoleListData,
  UserFormValues,
} from "../../types/userManagement";

import "./AdminPages.css";

const actionIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const EditActionIcon = () => (
  <svg {...actionIconProps}>
    <path d="M9.5 3.5 12.5 6.5M2.75 13.25l2.1-.35 7.4-7.4a1.5 1.5 0 0 0-2.12-2.12l-7.4 7.4-.35 2.1Z" />
  </svg>
);

const StatusActionIcon = ({ isActive }: { isActive: boolean }) => (
  <svg {...actionIconProps} viewBox="0 0 24 24" width={16} height={16} strokeWidth={1.9}>
    {isActive ? (
      <>
        <path d="M12 2v10" />
        <path d="M18.4 5.6a8 8 0 1 1-12.8 0" />
      </>
    ) : (
      <>
        <path d="M12 2v6" />
        <path d="M18.4 5.6a8 8 0 1 1-12.8 0" />
      </>
    )}
  </svg>
);

const DeleteActionIcon = () => (
  <svg {...actionIconProps}>
    <path d="M3 4.5h10M6.25 4.5V3.25A.75.75 0 0 1 7 2.5h2a.75.75 0 0 1 .75.75V4.5M12.25 4.5V13a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1V4.5" />
  </svg>
);

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "Never signed in";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const getUserStatusVariant = (
  user: ManagedUser,
): "active" | "inactive" | "suspended" => {
  if (user.status === "suspended") {
    return "suspended";
  }

  if (user.status === "active" && user.is_active) {
    return "active";
  }

  return "inactive";
};

const getUserStatusLabel = (user: ManagedUser): string => {
  const statusVariant = getUserStatusVariant(user);

  if (statusVariant === "active") {
    return "Active";
  }

  if (statusVariant === "suspended") {
    return "Suspended";
  }

  return "Inactive";
};

export const AdminUsersPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roleSlug } = useParams<{ roleSlug?: string }>();
  const peopleRole = useMemo(() => getAdminPeopleRoleBySlug(roleSlug), [roleSlug]);

  const [usersData, setUsersData] = useState<ManagedUserListData | null>(null);
  const [rolesData, setRolesData] = useState<RoleListData | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editInitialValues, setEditInitialValues] = useState<Partial<UserFormValues> | null>(
    null,
  );
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editFormKey, setEditFormKey] = useState(0);

  useEffect(() => {
    if (!successNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessNotice(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successNotice]);

  const users = usersData?.results ?? [];
  const roles = rolesData?.results ?? [];
  const lockedRole = peopleRole
    ? (roles.find((role) => role.role_name === peopleRole.roleName) ?? null)
    : null;
  const lockedRoleId = lockedRole ? String(lockedRole.role_id) : "";
  /** Prefer route-locked role so switching People links never keeps the previous list filter. */
  const listRoleId = peopleRole ? lockedRoleId : selectedRoleId;
  const addButtonLabel = peopleRole?.addButtonLabel ?? "Add User";
  const formRoles = lockedRole ? [lockedRole] : roles;
  const canCreatePeopleUser = peopleRole?.roleName !== ROLE_NAMES.COMPANY_ADMINISTRATOR;

  useEffect(() => {
    if (roleSlug && !peopleRole) {
      navigate(getAdminPeoplePath("project-managers"), { replace: true });
    }
  }, [navigate, peopleRole, roleSlug]);

  useEffect(() => {
    if (!peopleRole || !lockedRoleId) {
      return;
    }

    setSelectedRoleId(lockedRoleId);
  }, [lockedRoleId, peopleRole]);

  const openAddUser = useCallback(() => {
    setFormKey((current) => current + 1);
    setIsAddUserOpen(true);
  }, []);

  const closeAddUser = useCallback(() => {
    setIsAddUserOpen(false);
  }, []);

  const closeEditUser = useCallback(() => {
    setIsEditUserOpen(false);
    setEditingUserId(null);
    setEditInitialValues(null);
    setIsEditLoading(false);
  }, []);

  const openEditUser = useCallback(async (userId: number) => {
    setIsAddUserOpen(false);
    setEditingUserId(userId);
    setIsEditUserOpen(true);
    setIsEditLoading(true);
    setEditInitialValues(null);
    setErrorMessage(null);

    try {
      const userResponse = await getUser(userId);
      setEditInitialValues({
        name: userResponse.name,
        email: userResponse.email,
        phone_number: userResponse.phone_number,
        role_id: userResponse.role.role_id,
        password: "",
      });
      setEditFormKey((current) => current + 1);
    } catch {
      setErrorMessage("Unable to load the selected user right now.");
      setIsEditUserOpen(false);
      setEditingUserId(null);
    } finally {
      setIsEditLoading(false);
    }
  }, []);

  useEffect(() => {
    const routeState = location.state as
      | {
          notice?: string;
          openAddUser?: boolean;
          editUserId?: number;
        }
      | null;

    if (!routeState) {
      return;
    }

    if (routeState.notice) {
      setSuccessNotice(String(routeState.notice));
    }

    if (routeState.openAddUser && canCreatePeopleUser) {
      openAddUser();
    }

    if (typeof routeState.editUserId === "number") {
      void openEditUser(routeState.editUserId);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [canCreatePeopleUser, location.pathname, location.state, navigate, openAddUser, openEditUser]);

  const loadUsers = async (search = submittedSearch, roleId = listRoleId) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await listUsers({
        search: search || undefined,
        role_id: roleId ? Number(roleId) : undefined,
      });

      setUsersData(response);
    } catch {
      setErrorMessage("Unable to load users right now. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadRoles = async () => {
      try {
        const response = await fetchRoles();

        if (isMounted) {
          setRolesData(response);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load roles right now.");
        }
      }
    };

    void loadRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (peopleRole && !lockedRoleId) {
      setUsersData(null);
      setIsLoading(true);
      return;
    }

    void loadUsers(submittedSearch, listRoleId);
  }, [listRoleId, lockedRoleId, peopleRole, submittedSearch]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSubmittedSearch("");
    if (!peopleRole) {
      setSelectedRoleId("");
    }
  };

  const handleCreateUser = async (values: UserFormValues) => {
    await createUser({
      name: values.name,
      email: values.email,
      phone_number: values.phone_number,
      role_id: lockedRole ? lockedRole.role_id : (values.role_id as number),
      password: values.password,
    });

    setSuccessNotice("User created successfully.");
    closeAddUser();
    await loadUsers();
  };

  const handleUpdateUser = async (values: UserFormValues) => {
    if (!editingUserId) {
      return;
    }

    await updateUser(editingUserId, {
      name: values.name,
      email: values.email,
      phone_number: values.phone_number,
      role_id: lockedRole ? lockedRole.role_id : values.role_id,
      ...(values.password ? { password: values.password } : {}),
    });

    setSuccessNotice("User updated successfully.");
    closeEditUser();
    await loadUsers();
  };

  const handleToggleStatus = async (managedUser: ManagedUser) => {
    setProcessingUserId(managedUser.user_id);
    setErrorMessage(null);

    try {
      if (managedUser.is_active && managedUser.status === "active") {
        await deactivateUser(managedUser.user_id);
      } else {
        await activateUser(managedUser.user_id);
      }

      await loadUsers();
    } catch {
      setErrorMessage("Unable to update the user status right now.");
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDelete = async (managedUser: ManagedUser) => {
    const confirmed = window.confirm(
      `Delete ${managedUser.name}? This will remove the user profile and login account.`,
    );

    if (!confirmed) {
      return;
    }

    setProcessingUserId(managedUser.user_id);
    setErrorMessage(null);

    try {
      await deleteUser(managedUser.user_id);
      await loadUsers();
    } catch {
      setErrorMessage("Unable to delete the user right now.");
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div className="admin-page admin-page--users">
      {successNotice ? <div className="alert alert-success mb-0">{successNotice}</div> : null}
      {errorMessage ? <div className="alert alert-danger mb-0">{errorMessage}</div> : null}

      <section className="page-list admin-users__list">
        <PageToolbar
          action={
            canCreatePeopleUser ? (
              <button type="button" className="admin-btn admin-btn--primary" onClick={openAddUser}>
                {addButtonLabel}
                <span className="admin-btn__plus" aria-hidden="true">
                  +
                </span>
              </button>
            ) : undefined
          }
          filter={
            <FilterBar
              searchValue={searchInput}
              searchPlaceholder="Search by name, email, phone, or role"
              onSearchChange={setSearchInput}
              selectValue={selectedRoleId}
              selectAriaLabel="Filter by role"
              selectOptions={[
                { value: "", label: "All roles" },
                ...roles.map((role) => ({
                  value: String(role.role_id),
                  label: role.role_name,
                })),
              ]}
              onSelectChange={setSelectedRoleId}
              onSubmit={handleSearchSubmit}
              onReset={handleResetFilters}
              hideSelect={Boolean(peopleRole)}
            />
          }
        />

        {isLoading ? (
          <div className="admin-users__empty">Loading users...</div>
        ) : users.length === 0 ? (
          <EmptyState
            title={peopleRole?.emptyTitle ?? "No users match the current filters."}
            description={
              peopleRole?.emptyDescription ?? "Try adjusting search or create a new user."
            }
            action={
              canCreatePeopleUser ? (
                <button type="button" className="admin-btn admin-btn--primary" onClick={openAddUser}>
                  {addButtonLabel}
                  <span className="admin-btn__plus" aria-hidden="true">
                    +
                  </span>
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="page-list__items admin-users__items">
            {users.map((managedUser) => {
              const isActive = managedUser.is_active && managedUser.status === "active";
              const statusActionLabel = isActive ? "Deactivate" : "Activate";
              const statusVariant = getUserStatusVariant(managedUser);

              return (
                <article key={managedUser.user_id} className="admin-user-card">
                  <div className="admin-user-card__main">
                    <h3 className="admin-user-card__title">{managedUser.name}</h3>
                    <div className="admin-user-card__meta">
                      <span>{managedUser.email}</span>
                      <span className="admin-user-card__meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <span>{managedUser.role.role_name}</span>
                      <span className="admin-user-card__meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <span>{formatDateTime(managedUser.last_login)}</span>
                    </div>
                  </div>

                  <div className="admin-user-card__status-wrap">
                    <span
                      className={`status-pill admin-user-card__status admin-user-card__status--${statusVariant}`}
                    >
                      {getUserStatusLabel(managedUser)}
                    </span>
                  </div>

                  <div className="admin-icon-btn-group admin-user-card__actions">
                    <button
                      type="button"
                      aria-label={`Edit ${managedUser.name}`}
                      className="admin-icon-btn admin-user-card__action"
                      title="Edit"
                      onClick={() => void openEditUser(managedUser.user_id)}
                    >
                      <EditActionIcon />
                    </button>
                    <button
                      type="button"
                      aria-label={`${statusActionLabel} ${managedUser.name}`}
                      className="admin-icon-btn admin-user-card__action"
                      onClick={() => void handleToggleStatus(managedUser)}
                      disabled={processingUserId === managedUser.user_id}
                      title={statusActionLabel}
                    >
                      <StatusActionIcon isActive={isActive} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${managedUser.name}`}
                      className="admin-icon-btn admin-icon-btn--danger admin-user-card__action"
                      onClick={() => void handleDelete(managedUser)}
                      disabled={processingUserId === managedUser.user_id}
                      title="Delete"
                    >
                      <DeleteActionIcon />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AddUserModal
        isOpen={isAddUserOpen && canCreatePeopleUser}
        onClose={closeAddUser}
        title={peopleRole?.modalTitle ?? "Add User"}
        description={
          peopleRole?.modalDescription ?? "Assign a role and set login details."
        }
      >
        {formRoles.length === 0 ? (
          <div className="admin-users__empty">Loading role options...</div>
        ) : (
          <UserForm
            key={formKey}
            formKey={formKey}
            mode="create"
            roles={formRoles}
            initialValues={lockedRole ? { role_id: lockedRole.role_id } : undefined}
            lockRole={Boolean(lockedRole)}
            onSubmit={handleCreateUser}
            onCancel={closeAddUser}
            submitLabel={peopleRole?.createSubmitLabel ?? "Create User"}
            busyLabel="Creating..."
          />
        )}
      </AddUserModal>

      <AddUserModal
        isOpen={isEditUserOpen}
        onClose={closeEditUser}
        title="Edit User"
        titleId="edit-user-modal-title"
        description="Update account details and role assignment."
      >
        {isEditLoading ? (
          <div className="admin-users__empty">Loading user details...</div>
        ) : editInitialValues && formRoles.length > 0 ? (
          <UserForm
            key={editFormKey}
            formKey={editFormKey}
            mode="edit"
            roles={formRoles}
            initialValues={editInitialValues}
            lockRole={Boolean(lockedRole)}
            onSubmit={handleUpdateUser}
            onCancel={closeEditUser}
            submitLabel="Save Changes"
            busyLabel="Saving..."
          />
        ) : (
          <div className="admin-users__empty">Unable to load user details.</div>
        )}
      </AddUserModal>
    </div>
  );
};

export default AdminUsersPage;
