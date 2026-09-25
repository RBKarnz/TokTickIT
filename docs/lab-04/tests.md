# Lab 4 Test Plan

## 1. Test Strategy

Testing in Sprint 4 is planned and maintained alongside the engineering contract, establishing complete traceability to approved Acceptance Criteria (AC-01 through AC-30). Testing exercises every architectural tier using real persistence, strict schema validation, server-enforced business rules, and multi-viewport end-to-end user journeys.

A passing test MUST NOT be achieved by:
- hardcoding or mocking API responses in production paths;
- bypassing server-side validation or business rule middleware;
- mocking database persistence for end-to-end assertion flows;
- asserting only frontend UI visibility for authorization enforcement;
- directly mutating database state via test backdoor helpers after the action under test;
- disabling CSRF, origin check, or session authentication middleware;
- using test-only shortcut logic in place of production business workflows.

All tests operate against a real PostgreSQL database instance and evaluate exact HTTP status codes, error envelopes, and UI interaction states.

## 2. Test File Layout

### Server Tests (`server/tests/lab-04/`)
- `actions-taken.api.test.ts`: Action Taken CRUD, validations, OCC, idempotency, role guards.
- `ticket-workflow.api.test.ts`: Status transition matrix, resolution gate, status history logging.
- `requester-dashboard.api.test.ts`: Requester dashboard aggregation, date bounds, ownership isolation.
- `staff-dashboard.api.test.ts`: Staff & Admin metrics, direct Prisma comparisons, drill-down parameters.
- `migration.api.test.ts`: Additive schema deployment, backfill integrity, rollback and recovery verification.
- `performance.smoke.test.ts`: Sub-500ms p95 latency verification for dashboard aggregation endpoints.

### Client Component Tests (`client/tests/lab-04/`)
- `StaffDashboard.test.tsx`: IT Staff and Administrator dashboard metrics, lists, quick actions, drill-downs.
- `RequesterDashboard.test.tsx`: Requester dashboard cards, recent tickets, empty states, error handling.
- `ActionsTaken.test.tsx`: Actions list, create mode conditional validation, edit mode, Requester read-only view.
- `TicketWorkflow.test.tsx`: Permitted status options, resolution gate modal feedback, timeline ordering.

### End-to-End Tests (`e2e/lab-04/`)
- `actions-taken-flow.spec.ts`: Full lifecycle of actions recorded by multiple staff, assignment, completion.
- `ticket-resolution.spec.ts`: End-to-end resolution gating, blocker resolution, requester confirmation.
- `dashboards.spec.ts`: Multi-role login landing, metric card navigation, drill-down filtering, responsiveness.
- `style.spec.ts`: Zen Green design token compliance, keyboard focus rings, layout integrity on 3 viewports.

## 3. API & Integration Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Create valid Action Taken by IT Staff | 201 Created, ticket linked, creator auto-set, assignee set | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | AC-01, AC-15 | Create valid Action Taken by Administrator | 201 Created, admin accepted as performer and assignee | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-03 | Client attempts to spoof `performedById` | Server ignores client value, sets authenticated user ID | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | AC-04 | Create action with `followUpRequired=true` but missing note | 422 Unprocessable, field error on `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API | AC-04 | Create action with `followUpRequired=false` but note supplied | 422 Unprocessable, note must be empty when follow-up false | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API | AC-05 | Assign action to inactive IT Staff user | 422 Unprocessable, assignee must be active staff or admin | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API | AC-05 | Assign action to user with `REQUESTER` role | 422 Unprocessable, requesters cannot be assigned actions | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | API | AC-06 | Move action from `PLANNED` to `IN_PROGRESS` | 200 OK, status updated, version incremented | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-09 | API | AC-06 | Complete action without providing `result` | 422 Unprocessable, result required on completion | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-10 | API | AC-06 | Move action from `IN_PROGRESS` to `COMPLETED` with result | 200 OK, terminal status set, version incremented | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-11 | API | AC-06 | Move action from `PLANNED` to `CANCELLED` | 200 OK, terminal status set | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-12 | API | AC-06 | Attempt update on `COMPLETED` action | 409 Conflict with code `ACTION_CLOSED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-13 | API | AC-06 | Attempt update on `CANCELLED` action | 409 Conflict with code `ACTION_CLOSED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-14 | API | AC-07 | List actions for ticket with multiple actions | 200 OK, items ordered by `actionAt ASC, id ASC` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-15 | API | AC-08 | Requester reads actions of own ticket | 200 OK, full action details returned read-only | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-16 | API | AC-08 | Requester attempts to create action on own ticket | 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-17 | API | AC-08 | Requester attempts to update action on own ticket | 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-18 | API | AC-08 | Requester reads actions of another user's ticket | 404 Not Found (safe non-disclosure) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-19 | API | AC-09 | Create action with `Idempotency-Key` header | 201 Created | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-20 | API | AC-09 | Repeat action creation with identical `Idempotency-Key` | 200 OK, `Idempotent-Replay: true`, no duplicate row created | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-21 | API | AC-14 | Update action with mismatched `expectedVersion` | 409 Conflict with code `STALE_UPDATE`, current state in body | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-22 | API | AC-10 | Attempt to add action to `CLOSED` ticket | 409 Conflict, cannot add actions to closed tickets | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-23 | API | AC-10 | Attempt to add action to `CANCELLED` ticket | 409 Conflict, cannot add actions to cancelled tickets | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-24 | API | AC-01 | Create action with `actionAt` timestamp >5 minutes in future | 422 Unprocessable, timestamp cannot exceed future tolerance | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-25 | API | AC-10 | IT Staff executes permitted transition `OPEN` -> `IN_PROGRESS` | 200 OK, ticket status updated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-26 | API | AC-10, AC-15 | Administrator executes transition `NEW` -> `OPEN` | 200 OK, admin permitted | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-27 | API | AC-10 | Execute unpermitted transition `NEW` -> `RESOLVED` directly | 409 Conflict, invalid status transition | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-28 | API | AC-10 | Requester attempts status change endpoint | 403 Forbidden | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-29 | API | AC-11 | Transition to `RESOLVED` without `resolutionSummary` | 409 Conflict with details `RESOLUTION_SUMMARY_REQUIRED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-30 | API | AC-11 | Transition to `RESOLVED` with zero completed actions | 409 Conflict with details `COMPLETED_ACTION_REQUIRED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-31 | API | AC-11 | Transition to `RESOLVED` with pending follow-up action | 409 Conflict with details `PENDING_FOLLOW_UP` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-32 | API | AC-11 | Transition to `RESOLVED` fulfilling all three gate rules | 200 OK, status changes to `RESOLVED`, history appended | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-33 | API | AC-12 | Requester calls `problem-appears-resolved` | 200 OK, timestamp recorded, status stays unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-34 | API | AC-13 | Retrieve status history for ticket after transitions | 200 OK, list ordered `createdAt ASC, id ASC`, actor populated | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-35 | API | AC-14 | Status transition with stale `expectedVersion` | 409 Conflict with code `STALE_UPDATE` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-36 | API | AC-02 | Requester retrieves dashboard data | 200 OK, counts and lists contain only requester's tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-37 | API | AC-16 | IT Staff dashboard metrics match direct database queries | 200 OK, every metric value matches Prisma count assertion | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-38 | API | AC-17 | Administrator dashboard returns user counts | 200 OK, active and inactive counts per role present | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-39 | API | AC-18 | Staff queue API accepts drill-down parameters (`actionAssignee=me`) | 200 OK, filtered list matches dashboard action count | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-40 | API | AC-19 | Dashboard endpoint on empty database state | 200 OK, counts are 0, arrays are empty `[]`, never `null` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |

## 4. Unit Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-06 | Action status transition helper validation | Validates permitted next states from matrix | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| UNIT-02 | Unit | AC-10 | Ticket status matrix transition helper | Returns true only for matrix-approved state pairs | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| UNIT-03 | Unit | AC-11 | Resolution gate pure evaluator | Evaluates summary, completed action, follow-up flags | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| UNIT-04 | Unit | AC-04 | Follow-up note validator | Rejects empty note if follow-up required is true | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| UNIT-05 | Unit | AC-01 | Action datetime tolerance checker | Rejects timestamps > 5 minutes in future | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| UNIT-06 | Unit | AC-16 | Open group status classifier | Maps 5 statuses to Open group, 3 to Non-Open | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| UNIT-07 | Unit | AC-02 | Asia/Bangkok 7-day rolling window calculator | Calculates rolling 168h boundary without timezone offset errors | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| UNIT-08 | Unit | AC-16 | Dashboard metric builder aggregator | Correctly folds Prisma aggregates into response envelope | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |

## 5. Workflow Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | AC-01, AC-11 | Full lifecycle: NEW -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED | Actions recorded, gate passed, closed confirmed | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-02 | Workflow | AC-11 | Reopened ticket lifecycle: REOPENED -> IN_PROGRESS -> RESOLVED | Gate re-evaluated on second resolution; passes | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-03 | Workflow | AC-10 | Terminal ticket lifecycle: NEW -> CANCELLED | Terminal status prevents any subsequent changes | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-04 | Workflow | AC-10 | Closed ticket reopen: CLOSED -> REOPENED | Successfully transitions with mandatory reason | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-05 | Workflow | AC-13 | Status history append count matches state transitions | Exactly N history records created for N transitions | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-06 | Workflow | AC-14 | Concurrent status updates on same ticket | First update succeeds; second update yields 409 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |

## 6. Migration & Regression Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | AC-21 | Deploy Lab 4 migration on existing Lab 3 database | All users, tickets, comments, notes, attachments intact | `server/tests/lab-04/migration.api.test.ts` | Planned |
| MIG-02 | Migration | AC-21 | Backfill verification for legacy tickets | Each legacy ticket receives exactly 1 history row | `server/tests/lab-04/migration.api.test.ts` | Planned |
| MIG-03 | Migration | AC-21 | Legacy ticket action count post-migration | Legacy tickets have count = 0 actions taken | `server/tests/lab-04/migration.api.test.ts` | Planned |
| MIG-04 | Migration | AC-22 | Idempotent seed execution (run seed twice) | Zero duplicate key errors; entity counts unchanged on replay | `server/tests/lab-04/migration.api.test.ts` | Planned |
| MIG-05 | Migration | AC-21 | Rollback procedure on disposable database | Down migration drops tables cleanly; data returns to Lab 3 state | `server/tests/lab-04/migration.api.test.ts` | Planned |

## 7. Performance-Smoke Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| PERF-01 | Performance | AC-28 | Requester dashboard latency under load | p95 response time < 500 ms over 20 consecutive requests | `server/tests/lab-04/performance.smoke.test.ts` | Planned |
| PERF-02 | Performance | AC-28 | Staff & Admin dashboard latency under load | p95 response time < 500 ms over 20 consecutive requests | `server/tests/lab-04/performance.smoke.test.ts` | Planned |

## 8. UI Component Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | AC-19, AC-20 | Requester dashboard metric cards rendering | Displays 4 metric values and accessible drill-down links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-02 | UI | AC-19 | Requester dashboard zero/empty states | Renders "0" count and empty list container cleanly | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-03 | UI | AC-16, AC-20 | Staff dashboard metric cards rendering | Displays operational cards, status pills, urgent list | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-04 | UI | AC-17 | Administrator dashboard user account breakdown | Renders active/inactive user counts per role | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-05 | UI | AC-18 | Dashboard drill-down link parameters | Clicking metric navigates to queue with pre-filled filters | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-06 | UI | AC-07 | Actions Taken list rendering on Ticket Detail | Lists actions with formatted timestamps and status badges | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-07 | UI | AC-04 | Create action conditional follow-up validation | Checking follow-up reveals required note field | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-08 | UI | AC-06 | Edit action status dropdown filtering | Shows only permitted next action statuses | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-09 | UI | AC-08 | Requester view on Actions Taken tab | Read-only list; form and edit buttons hidden; info note shown | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-10 | UI | AC-25 | 409 conflict handling preserves form input | Banner displayed; typed summary and notes preserved | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-11 | UI | AC-25 | Action submit button double-click guard | Button disabled with loading spinner while request in flight | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-12 | UI | AC-10 | Status change dropdown permitted options | Dropdown shows only permitted transitions for current status | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-13 | UI | AC-11 | Resolution gate modal checklist rendering | Checks off passed criteria; disables confirm on missing items | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-14 | UI | AC-13 | Status history timeline rendering | Displays chronological entries with actor, time, and reason | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-15 | UI | AC-15 | Administrator operational ticket view | Full staff operations accessible without permission errors | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-16 | UI | AC-20 | Header navigation active page highlight | Applies `aria-current="page"` and green underline to active route | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |

## 9. UI Style, Responsive & Accessibility Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | Style | AC-27 | Zen Green design token compliance | Buttons and accents use approved `#2E7D32` palette | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-02 | A11y | AC-27 | Keyboard focus rings on all interactive elements | Visible 2px outline on tab focus | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-03 | A11y | AC-27 | Non-color status cues on all badges | Status and priority badges include text labels and icons | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-04 | Responsive | AC-27 | Desktop viewport (1280px) layout | 4-column metric grid; full width actions table; zero overflow | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-05 | Responsive | AC-27 | Tablet viewport (768px) layout | 2-column metric grid; readable cards; zero overflow | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-06 | Responsive | AC-27 | Mobile viewport (375px) layout | 1-column metric stack; actions as cards; zero horizontal scroll | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-07 | A11y | AC-27 | Form field label and error associations | Inputs linked to labels via `for` and errors via `aria-describedby` | `e2e/lab-04/style.spec.ts` | Planned |
| STYLE-08 | Responsive | AC-27 | Modal and drawer responsive containment | Modals wrap within mobile screen without clipping | `e2e/lab-04/style.spec.ts` | Planned |

## 10. E2E Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01, AC-07 | IT Staff records multiple actions on a ticket | Actions saved, assigned, listed in chronological order | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-06 | IT Staff transitions action through to COMPLETED | Status changes, result entered, editing locked post-completion | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-11 | Staff attempts to resolve ticket blocked by gate | Resolution modal alerts missing completed action; blocked | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-04 | E2E | AC-11 | Staff fulfills gate and confirms resolution | Ticket resolves; summary badge updates; history appends | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-05 | E2E | AC-08 | Requester logs in and views resolved ticket | Sees all staff actions read-only and resolution notice | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-06 | E2E | AC-15 | Administrator claims, updates status, and logs action | Admin operates seamlessly in staff ticket workflow | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-07 | E2E | AC-20 | Login landing page routing for all three roles | Requester, Staff, and Admin land on respective `/dashboard` | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-08 | E2E | AC-18 | Staff dashboard metric drill-down navigation | Clicking "Unassigned" opens queue filtered by unassigned open | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-09 | E2E | AC-18 | Requester dashboard metric drill-down navigation | Clicking "Waiting for Me" opens My Tickets filtered | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-10 | E2E | AC-14 | Stale update detection in dual-browser simulation | Second user receives 409 conflict alert; typed input preserved | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-11 | E2E | AC-09 | Double-click action creation prevention | Rapid double click submits single request; creates 1 action | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-12 | E2E | AC-24 | Regression smoke: ticket creation, attachment, comment | Core Lab 1–3 user journey completes without regressions | `e2e/lab-04/dashboards.spec.ts` | Planned |

## 11. Security Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Security | AC-23 | State-changing request missing `X-CSRF-Token` | 403 Forbidden with code `CSRF_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-02 | Security | AC-23 | State-changing request with forged CSRF token | 403 Forbidden with code `CSRF_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-03 | Security | AC-23 | State-changing request from unauthorized `Origin` | 403 Forbidden with code `CSRF_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-04 | Security | AC-08 | Requester calls direct POST to create Action Taken | 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-05 | Security | AC-08 | Requester calls direct GET for other user's actions | 404 Not Found (safe non-disclosure) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-06 | Security | AC-03 | Client sends forged `performedById` parameter | Server ignores parameter; stores authenticated user ID | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-07 | Security | AC-30 | API response payload auditing | No passwords, hashes, session secrets in responses | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| SEC-08 | Security | AC-30 | XSS payload injection in action description | Script tags safely escaped and rendered as text | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |

## 12. Lab 1–3 Regression Coverage

All automated test suites from Labs 1 through 3 are preserved in the repository and must pass cleanly on `main`:
- `server/tests/lab-01/*`
- `server/tests/lab-02/*`
- `server/tests/lab-03/*`
- `client/tests/lab-01/*`
- `client/tests/lab-02/*`
- `client/tests/lab-03/*`
- `e2e/lab-02/*`
- `e2e/lab-03/*`

### Expected Test Adjustments for BR-14 (Issue #6)

In Lab 3, tests asserted that Administrators could not perform IT Staff ticket operations (`BR-23` and `BR-41`). Per Lab 4 handout Section 4.3, Administrators are granted full operational IT Staff permissions. The following Lab 3 test assertions will be updated in Issue #6 to expect `200/201` instead of `403`:
1. `server/tests/lab-03/authorization.api.test.ts`: Admin claiming ticket -> now allowed (`200`).
2. `server/tests/lab-03/authorization.api.test.ts`: Admin updating IT Priority -> now allowed (`200`).
3. `server/tests/lab-03/authorization.api.test.ts`: Admin updating ticket status -> now allowed (`200`).
4. `server/tests/lab-03/comments-notes.api.test.ts`: Admin creating internal note -> now allowed (`201`).

All other Lab 1–3 assertions remain strictly unchanged.

## 13. Test Data Rules

### Standard User Accounts (Seeded)

| Role | Email | Status | Initial Password State |
|---|---|---|---|
| `REQUESTER` | `requester1@toktick.it` | Active | Changed (Normal session) |
| `REQUESTER` | `requester2@toktick.it` | Active | Changed (Normal session) |
| `REQUESTER` | `firstlogin.requester@toktick.it` | Active | Must change password |
| `IT_STAFF` | `staff1@toktick.it` | Active | Changed (Normal session) |
| `IT_STAFF` | `staff2@toktick.it` | Active | Changed (Normal session) |
| `IT_STAFF` | `inactive.staff@toktick.it` | Inactive | Rejection test fixture |
| `ADMINISTRATOR` | `admin1@toktick.it` | Active | Changed (Normal session) |

*All account passwords derive deterministically from environment variable `SEED_DEFAULT_PASSWORD`.*

### Lab 4 Test Fixtures

- Tickets with 0 actions (legacy regression tickets).
- Tickets with 1 planned action and 1 in-progress action.
- Tickets with completed actions and no pending follow-up (ready for resolution).
- Tickets with completed actions but an outstanding follow-up note (resolution gate blocker).
- Multi-action tickets with actions performed by different staff members.
- Distribution producing zero counts for specific statuses and non-zero counts for others to test empty and populated dashboard states.

## 14. Traceability Matrix

| Acceptance Criterion | Covered by Test IDs |
|---|---|
| AC-01 | API-01, API-02, API-24, E2E-01, UNIT-05 |
| AC-02 | API-36, UNIT-07, E2E-09 |
| AC-03 | API-03, SEC-06 |
| AC-04 | API-04, API-05, UNIT-04, UI-07 |
| AC-05 | API-06, API-07 |
| AC-06 | API-08, API-09, API-10, API-11, API-12, API-13, UNIT-01, UI-08, E2E-02 |
| AC-07 | API-14, UI-06, E2E-01 |
| AC-08 | API-15, API-16, API-17, API-18, UI-09, E2E-05, SEC-04, SEC-05 |
| AC-09 | API-19, API-20, E2E-11 |
| AC-10 | API-22, API-23, API-25, API-26, API-27, API-28, UNIT-02, UI-12, WF-03, WF-04 |
| AC-11 | API-29, API-30, API-31, API-32, UNIT-03, UI-13, WF-01, WF-02, E2E-03, E2E-04 |
| AC-12 | API-33 |
| AC-13 | API-34, UI-14, WF-05 |
| AC-14 | API-21, API-35, UI-10, WF-06, E2E-10 |
| AC-15 | API-02, API-26, UI-15, E2E-06 |
| AC-16 | API-37, UNIT-06, UNIT-08, UI-03 |
| AC-17 | API-38, UI-04 |
| AC-18 | API-39, UI-05, E2E-08, E2E-09 |
| AC-19 | API-40, UI-01, UI-02, UI-03 |
| AC-20 | UI-01, UI-03, UI-16, E2E-07 |
| AC-21 | MIG-01, MIG-02, MIG-03, MIG-05 |
| AC-22 | MIG-04 |
| AC-23 | SEC-01, SEC-02, SEC-03 |
| AC-24 | E2E-12, Section 12 regression suite |
| AC-25 | UI-10, UI-11 |
| AC-26 | UI-16, Manual inspection checklist |
| AC-27 | STYLE-01, STYLE-02, STYLE-03, STYLE-04, STYLE-05, STYLE-06, STYLE-07, STYLE-08 |
| AC-28 | PERF-01, PERF-02 |
| AC-29 | Complete test suite coverage across Sections 3 through 11 |
| AC-30 | SEC-07, SEC-08, Test strategy adherence |

## 15. Required Final Evidence

Prior to final PDF report submission, the following verification artifacts must be generated directly from the passing `main` branch:
1. Complete Vitest test logs showing all unit, API, integration, and UI component tests passing cleanly.
2. Complete Playwright test logs showing all E2E journeys passing on Desktop (1280px), Tablet (768px), and Mobile (375px).
3. Migration and rollback execution log demonstrating zero data loss on a disposable database.
4. Direct SQL vs API comparison log verifying that staff dashboard metrics match raw database counts.
5. High-resolution screenshots of Requester Dashboard, Staff Dashboard, and Actions Taken screens across all 3 viewports.
6. Commit history graph demonstrating that the engineering contract was merged before implementation commits.
