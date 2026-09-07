# Project Team Assignment — Implementation Report

## 1. Existing files inspected

- `backend/projects/models.py` — `ProjectAssignment`, unique constraints
- `backend/projects/services.py` — `_sync_assignment`, `_viewable_queryset`, create/update project
- `backend/projects/serializers.py` — project read/write serializers
- `backend/projects/execution_services.py` — SE/Supervisor project scoping, worker assignment
- `frontend/src/components/projects/ProjectForm.tsx` — prior singular SE/Supervisor selects
- `frontend/src/types/project.ts`, `projectApi.ts`
- Site Engineer / Supervisor / Worker / PM dashboards and project pages
- `TaskAssignmentManager.tsx` — Supervisor → Worker duty assignment

## 2. Files modified

### Backend
- `backend/projects/models.py`
- `backend/projects/services.py`
- `backend/projects/serializers.py`

### Frontend
- `frontend/src/types/project.ts`
- `frontend/src/components/projects/ProjectForm.tsx`
- `frontend/src/components/projects/ProjectForm.css`
- `frontend/src/components/projects/ProjectQuickViewModal.tsx`
- `frontend/src/components/projects/TaskAssignmentManager.tsx`
- `frontend/src/components/projects/TaskAssignmentManager.css`
- `frontend/src/pages/projects/ProjectOverviewPage.tsx`
- `frontend/src/pages/siteEngineer/SiteEngineerProjectsPage.tsx`
- `frontend/src/pages/supervisor/SupervisorProjectsPage.tsx`

## 3. Files created

- `backend/projects/migrations/0008_multi_site_engineer_supervisor.py`
- `PROJECT_TEAM_ASSIGNMENT_REPORT.md` (this file)

## 4. Database / schema changes

Migration `0008`:
- Added `assigned_by` (FK to UserProfile, nullable)
- Added `deactivated_at` (DateTime, nullable)
- Removed `unique_active_project_assignment_role` (one active person per role)
- Added `unique_active_singular_project_assignment_role` — **only** for `project_manager` and `client`

Result:
- Multiple active Site Engineers per project allowed
- Multiple active Supervisors per project allowed
- PM/Client remain singular
- Soft-deactivate preserves assignment history rows

## 5. APIs / services

| Change | Detail |
|---|---|
| Create/Update project | Accept `site_engineer_ids[]`, `supervisor_ids[]` (preferred) |
| Backward compat | Still accept singular `site_engineer_id` / `supervisor_id` |
| `_sync_role_assignees` | Multi-member sync with soft history |
| `_sync_assignment` | Still used for PM/Client; now sets `assigned_by` / `deactivated_at` |
| Response | Adds `site_engineers[]`, `supervisors[]`; keeps singular fields as first member |

No new endpoints required — existing create/update/list already drive dashboard filtering via `_viewable_queryset`.

## 6. Project-team assignment implementation

- Project Manager / Company Admin assign team in project create/edit form
- Only users with Site Engineer / Supervisor roles appear in pickers
- Add / remove members; save syncs active set
- Removed members set `is_active=False` + `deactivated_at` (history retained)
- Role ≠ project access: dashboards already filter by active `ProjectAssignment`

## 7. Site Engineer dashboard changes

- Already filtered by active `site_engineer` assignment (no rewrite needed)
- Multi-SE projects now appear for **each** assigned SE
- Projects page shows plural Supervisors list

## 8. Supervisor dashboard changes

- Already filtered by active `supervisor` assignment
- Multi-Supervisor projects appear for each assigned Supervisor
- Worker assignment UI shows Required vs Assigned, staffing warning, expected work/completion, required duty instructions

## 9. Worker dashboard changes

- Unchanged path: workers see tasks via `TaskWorkerAssignment` (`listMyTaskAssignments`)
- Duty instructions now required when Supervisor assigns
- Daily update / dual verification workflow unchanged

## 10. Role / permission changes

None. Existing role checks + project assignment scoping reused.

## 11. Workflow changes

```
PM/Admin assigns Site Engineer(s) + Supervisor(s) on project
        ↓
SE dashboard shows only assigned projects
        ↓
SE creates tasks → PM approves
        ↓
Assigned Supervisors see project/tasks
        ↓
Supervisor assigns workers + duties
        ↓
Workers see their assignments
        ↓
Daily update → Supervisor verify → SE verify → official progress
```

## 12. Tests performed

- Migration `0008` applied successfully
- Lint check on modified frontend files (clean)
- Full multi-role live E2E not executed in this session (needs seeded accounts)

## 13. Acceptance checklist

| Item | Status |
|---|---|
| PM can assign Site Engineer(s) | Implemented |
| PM can assign Supervisor(s) | Implemented |
| Admin same team functionality | Implemented (shared form/API) |
| Only correct roles selectable | Implemented |
| Multiple SE/Supervisors supported | Implemented |
| Assignment stored against project | Implemented |
| Assignment history preserved (soft deactivate) | Implemented |
| SE sees only assigned projects | Implemented (existing scoping + multi) |
| Unassigned projects hidden from SE | Implemented |
| SE milestones/tasks/expected work/verification | Implemented (existing SE module) |
| Supervisor sees only assigned projects | Implemented |
| Approved tasks + worker selection + duties | Implemented (enhanced) |
| Required vs assigned manpower warning | Implemented |
| Worker sees only own assignments/duty | Implemented (existing) |
| Worker daily update + incomplete reason | Implemented (existing) |
| Dual verification → official progress | Implemented (existing) |
| Planned vs actual / schedule status | Implemented (existing) |
| Backend enforces role + project assignment | Implemented (existing) |
| Notifications | Not implemented — no existing SE/Supervisor notification subsystem to extend |
| Live E2E acceptance scenario | Needs attention — manual QA required |

## Principle confirmed

**Project assignment** controls which projects appear; **role** controls what the user can do; **task assignment** controls which work a Worker sees.
