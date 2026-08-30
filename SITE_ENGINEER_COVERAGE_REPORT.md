# Site Engineer Module — Coverage Report

## Summary

Site Engineer functionality was integrated into the existing FORTESITE architecture. Core workflow (task design → PM approval → supervisor assignment → worker updates → dual verification → official progress) already existed in the backend. This work extended task fields, strengthened timeline validation, and restructured the Site Engineer UI into an operational multi-page workspace.

## 1. Files created or modified

### Backend
- `backend/projects/models.py` — added `expected_work`, `completion_requirement`
- `backend/projects/migrations/0007_milestone_task_expected_work.py` — **new**
- `backend/projects/execution_serializers.py` — write/read serializers for new fields; required on create
- `backend/projects/execution_services.py` — milestone-bound task timeline validation

### Frontend
- `frontend/src/pages/siteEngineer/SiteEngineerDashboardPage.tsx` — overview dashboard
- `frontend/src/pages/siteEngineer/SiteEngineerProjectsPage.tsx` — **new**
- `frontend/src/pages/siteEngineer/SiteEngineerTasksPage.tsx` — **new**
- `frontend/src/pages/siteEngineer/SiteEngineerVerificationsPage.tsx` — **new**
- `frontend/src/pages/siteEngineer/SiteEngineerPages.css` — **new**
- `frontend/src/App.tsx` — SE routes
- `frontend/src/components/user/UserSidebar.tsx` — SE navigation
- `frontend/src/components/projects/TaskManager.tsx` / `.css` — expected work, completion, progress table
- `frontend/src/components/projects/DailyUpdateBoard.tsx` — verification history + Verify label
- `frontend/src/pages/projects/CreateTaskPage.tsx`, `EditTaskPage.tsx`, `ViewTaskPage.tsx`
- `frontend/src/types/project.ts` — task type/payload fields

## 2. Database / schema changes

Migration `0007_milestone_task_expected_work`:
- `tbl_milestone_task.expected_work` (TextField, blank allowed for legacy rows)
- `tbl_milestone_task.completion_requirement` (TextField, blank allowed for legacy rows)

**Create API now requires both fields** (server-side).

No change to daily update / dual-review schema (already present).

## 3. APIs / services

| Endpoint | Change |
|---|---|
| `POST .../milestones/<id>/tasks/` | Accepts/requires `expected_work`, `completion_requirement`; validates task dates vs milestone |
| `PATCH .../tasks/<id>/` | Accepts new fields; re-validates timeline when dates change |
| `GET` task serializers | Expose new fields |
| `POST .../task-updates/<id>/engineer-review/` | Unchanged (existing SE verification) |

Existing list/progress/schedule serializers unchanged in formula.

## 4. Role / permission changes

**None.** Existing permissions reused:
- SE: design tasks, view assignments, engineer-review daily updates
- PM/Admin: approve tasks
- Supervisor: assign workers, supervisor-review
- Worker: submit daily updates

## 5. UI changes

Site Engineer navigation:
- Dashboard
- Projects (milestones + planned vs actual + schedule)
- Tasks (create/edit with expected work, workforce, progress table)
- Verifications (project-wide supervisor-verified queue + history)

## 6. Progress calculation logic (existing, retained)

- **Official task progress** = average of latest **dual-approved** (supervisor + engineer) daily completion % per active assignment
- **Milestone progress** = equal-weight average of task progresses (**no conflicting weight system added**)
- **Planned progress** = linear elapsed duration / total duration × 100 (0–100)
- **Schedule status** = compare actual vs planned with existing ±2% tolerance → Ahead / On Schedule / Behind / Completed

## 7. Workflow implemented

```
Site Engineer creates task (expected work, completion requirement, dates, workers)
        ↓
Submitted as unapproved (is_approved=false)
        ↓
PM / Admin approves
        ↓
Supervisor assigns workers
        ↓
Worker submits daily update (+ incomplete reason when needed)
        ↓
Supervisor verifies / rejects
        ↓
Site Engineer verifies / rejects (only after supervisor approved)
        ↓
Dual-approved % becomes official → milestone progress recalculated
```

## 8. Tests performed

- Migration `0007` applied successfully
- Static inspection of permissions, serializers, SE routes, and TaskManager payload wiring
- Full live end-to-end Worker → Supervisor → SE → milestone progress **not executed in this session** (requires seeded multi-role accounts and browser flow)

## 9. Requirements checklist

| Requirement | Status |
|---|---|
| Site Engineer dashboard | Complete |
| Authorized project/milestone access | Complete (existing scoping) |
| Task creation / editing | Complete |
| Expected work | Complete (new field) |
| Completion requirement | Complete (new field) |
| Task timeline + milestone bounds | Complete (server validation) |
| Planned daily/linear progress | Complete (existing) |
| Required worker count | Complete (existing) |
| Task submission → PM approval | Complete (existing) |
| Supervisor handoff / assignment | Complete (existing) |
| Supervisor-verified daily updates | Complete |
| Site Engineer verification / reject with reason | Complete (existing + UI) |
| Resubmission after reject | Complete (existing reset to pending) |
| Official progress = dual-verified only | Complete (existing) |
| Planned vs actual + schedule status | Complete (existing + SE UI) |
| Task progress table | Complete |
| Daily update / verification history | Complete (UI) |
| Role permissions / server validation | Complete |
| Notifications | Not added (no existing SE notification system to extend) |
| Task weights for milestone progress | Deferred — kept equal-weight existing method |
| Full live E2E acceptance scenario | Pending manual QA |

## 10. Unresolved / deferred

1. **Live E2E acceptance test** across Worker → Supervisor → Site Engineer still needs manual verification with real accounts.
2. **Task weights** not introduced (would conflict with existing equal-average official progress). Architecture remains open for later weighted progress.
3. **Notifications** not built (no general notification subsystem for SE events).
4. Legacy tasks may have empty `expected_work` / `completion_requirement` until edited; new creates require both.
