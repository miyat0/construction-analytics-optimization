from accounts.permissions import (
    CLIENT_ROLE_NAME,
    COMPANY_ADMIN_ROLE_NAME,
    PROJECT_MANAGER_ROLE_NAME,
    SITE_ENGINEER_ROLE_NAME,
    SUPERVISOR_ROLE_NAME,
    WORKER_ROLE_NAME,
    RolePermission,
)


class IsProjectWorkspaceManager(RolePermission):
    allowed_roles = (COMPANY_ADMIN_ROLE_NAME, PROJECT_MANAGER_ROLE_NAME)
    message = "Only Company Administrator or Project Manager can manage project resources."


class IsProjectWorkspaceViewer(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SITE_ENGINEER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
        CLIENT_ROLE_NAME,
    )
    message = "Only approved project roles can access project resources."


class IsProjectExecutionTaskViewer(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SITE_ENGINEER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
    )
    message = "Only Company Administrator, Project Manager, Site Engineer, or Supervisor can view execution tasks."


class IsProjectExecutionTaskDesigner(RolePermission):
    allowed_roles = (COMPANY_ADMIN_ROLE_NAME, PROJECT_MANAGER_ROLE_NAME, SITE_ENGINEER_ROLE_NAME)
    message = "Only Company Administrator, Project Manager, or Site Engineer can create and edit milestone tasks."


class IsProjectExecutionTaskApprover(RolePermission):
    allowed_roles = (COMPANY_ADMIN_ROLE_NAME, PROJECT_MANAGER_ROLE_NAME)
    message = "Only Company Administrator or Project Manager can approve milestone tasks."


class IsProjectExecutionAssignmentManager(RolePermission):
    allowed_roles = (SUPERVISOR_ROLE_NAME,)
    message = "Only Supervisor can assign work to workers."


class IsProjectExecutionSupervisorReviewer(RolePermission):
    allowed_roles = (SUPERVISOR_ROLE_NAME,)
    message = "Only Supervisor can review worker task updates."


class IsProjectExecutionEngineerReviewer(RolePermission):
    allowed_roles = (SITE_ENGINEER_ROLE_NAME,)
    message = "Only Site Engineer can verify supervisor-reviewed daily updates."


class IsProjectExecutionConcernViewer(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SITE_ENGINEER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
    )
    message = "Only Company Administrator, Project Manager, Site Engineer, or Supervisor can review field concerns."


class IsProjectExecutionConcernResolver(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
    )
    message = "Only Supervisor, Project Manager, or Company Administrator can resolve field concerns."


class IsProjectExecutionWorker(RolePermission):
    allowed_roles = (WORKER_ROLE_NAME,)
    message = "Only Worker can access worker execution updates."


class IsWorkplaceNeedWorker(RolePermission):
    allowed_roles = (WORKER_ROLE_NAME,)
    message = "Only Worker can submit and track workplace needs."


class IsWorkplaceNeedSupervisorReviewer(RolePermission):
    allowed_roles = (SUPERVISOR_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME)
    message = "Only Supervisor can verify or reject workplace needs."


class IsWorkplaceNeedPmActor(RolePermission):
    allowed_roles = (PROJECT_MANAGER_ROLE_NAME, COMPANY_ADMIN_ROLE_NAME)
    message = "Only Project Manager can act on verified workplace needs."


class IsWorkplaceNeedWorkspaceViewer(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
    )
    message = "Only Supervisor, Project Manager, or Company Administrator can view project workplace needs."


class IsProjectExecutionTeamViewer(RolePermission):
    allowed_roles = (
        COMPANY_ADMIN_ROLE_NAME,
        PROJECT_MANAGER_ROLE_NAME,
        SITE_ENGINEER_ROLE_NAME,
        SUPERVISOR_ROLE_NAME,
    )
    message = "Only Company Administrator, Project Manager, Site Engineer, or Supervisor can view execution team data."
