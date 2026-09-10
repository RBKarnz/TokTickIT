# Lab 3 Test Plan

## 1. Test Strategy

Testing is planned before/alongside implementation and is traceable to the approved acceptance criteria. Tests must exercise the real application layers: database, service/business rules, HTTP authorization, UI components, and E2E workflows.

A passing test MUST NOT be achieved by:
- hardcoded API responses;
- bypassing validation;
- mocking the database for end-to-end persistence assertions;
- asserting only frontend visibility for an authorization requirement;
- directly changing production state from test helpers after the action under test;
- disabling security middleware;
- replacing real business logic with test-only shortcuts.

Mocks/stubs are allowed only for external dependencies that are genuinely outside Lab 3 scope, and only where the test still proves the local business behavior.

## 2. Test File Layout

Required API/integration:
- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/comments-notes.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`

Required UI:
- `client/tests/lab-03/Login.test.tsx`
- `client/tests/lab-03/ChangePassword.test.tsx`
- `client/tests/lab-03/StaffTicketQueue.test.tsx`
- `client/tests/lab-03/StaffTicketDetail.test.tsx`
- `client/tests/lab-03/UserManagement.test.tsx`

Required E2E:
- `e2e/lab-03/authentication.spec.ts`
- `e2e/lab-03/staff-ticket-flow.spec.ts`
- `e2e/lab-03/user-administration.spec.ts`

Test data should use a disposable test database and real application persistence.

## 3. API / Integration Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Active user valid login | 200, authenticated session, safe user + role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | AC-03 | Wrong password | 401, generic safe error | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-03 | Unknown email | Same safe failure class/message as wrong password | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | API | AC-03 | Inactive user login | 401, generic safe error | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-05 | API | AC-02 | Initial-password login | Restricted session, `mustChangePassword=true` | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-06 | API | AC-02 | Forced session calls normal Ticket API | 403 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-07 | API | AC-02 | Invalid new password | 422/400, password unchanged | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-08 | API | AC-04 | Requester requests Internal Notes | Forbidden; no note data returned | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-09 | API | AC-05 | `/auth/me` response | No passwordHash/session token | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-10 | API | AC-04 | Logout | Session revoked and cookie cleared | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-11 | Security | AC-04 | Reuse old session after logout | 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-12 | Security | AC-05 | Credentials in error/log payloads | No credentials/secrets | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-13 | Security | AC-06 | Requester sends alternate requesterId | Authenticated identity still determines Ticket ownership | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-14 | Security | AC-07 | Requester reads another user's Ticket | 404/403 without protected data | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-15 | Security | AC-07 | Requester reads another user's Attachment | 404/403 without protected data | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-16 | Security | AC-07 | Requester calls Internal Notes | Forbidden and no note data | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-17 | Regression | AC-20 | Requester creates Ticket through authenticated identity | Persisted requester ID equals authenticated user | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-18 | Regression | AC-20 | Existing Ticket retrieval | Old Ticket still available to correct Requester | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-19 | Regression | AC-20 | Existing Attachment flow | Existing Attachment ownership behavior preserved | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-20 | API | AC-08 | Staff queue default | Correct default ordering and pagination | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-21 | API | AC-08 | Queue search by Ticket Number | Matching records only | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-22 | API | AC-08 | Queue search by Summary | Matching records only | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-23 | API | AC-08 | Queue filters | Each specified filter returns correct set | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-24 | API | AC-08 | Queue sort fields | Requested sort field/order applied | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-25 | API | AC-08 | Queue pagination | Correct page/pageSize/metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-26 | API | AC-08 | Invalid queue params | 400 and no unsafe query behavior | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-27 | Security | AC-08 | Requester accesses staff queue | 403 | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-28 | API | AC-09 | Claim unassigned Ticket | Owner becomes authenticated IT Staff in DB | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-29 | API | AC-09 | Claim already-owned Ticket | 409, existing owner unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-30 | API | AC-09 | Assign to active IT Staff | Owner changes correctly | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-31 | API | AC-09 | Assign to inactive Staff | Rejected, owner unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-32 | API | AC-10 | Change IT Priority | IT Priority changes | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-33 | API | AC-10 | Requested Priority preservation | Requested Priority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-34 | API | AC-11 | Each allowed status transition | Persisted state changes | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-35 | API | AC-11 | Every forbidden transition | Rejected with no mutation | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-36 | Security | AC-11 | Requester attempts status change | Rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-37 | API | AC-12 | Problem Appears Resolved | Timestamp stored, formal status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-38 | API | AC-13 | Public Comment create | Persisted with backend author/time | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-39 | API | AC-13 | Public Comment empty/whitespace | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-40 | API | AC-13 | Public Comment >4000 chars | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-41 | API | AC-13 | Public Comment retrieval | Authorized viewer sees comments | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-42 | API | AC-14 | Internal Note create | Persisted for IT Staff | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-43 | API | AC-14 | Internal Note empty/whitespace | Rejected | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-44 | Security | AC-14 | Requester retrieves Internal Notes | Rejected; no content | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-45 | API | AC-14 | Internal Notes retrieval for Staff and Admin | Only note data visible to authorized staff/admin | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-46 | API | AC-15 | Non-Admin user list | 403 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-47 | API | AC-16 | Admin lists users | Safe list fields | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-48 | API | AC-16 | Search by name | Correct results | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-49 | API | AC-16 | Search by email | Correct results | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-50 | API | AC-16 | Role filter | Correct role only | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-51 | API | AC-16 | Create user | User persisted with one role + forced password change | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-52 | API | AC-17 | Duplicate email, case/whitespace variants | 409 and no duplicate row | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-53 | API | AC-17 | Invalid role | Rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-54 | API | AC-16 | Edit basic account fields | Persisted changes | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-55 | API | AC-18 | Self-deactivation | 409; self remains active | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-56 | API | AC-18 | Deactivate last active Admin | 409; Administrator remains active | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-57 | API | AC-16 | Deactivate another user | User becomes inactive; sessions revoked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-58 | API | AC-19 | Set initial password | Hash changes, mustChangePassword=true | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-59 | API | AC-19 | Initial password login after reset | Forced change | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-60 | Security | AC-19 | Existing target sessions after reset | Revoked | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-61 | Regression | AC-20 | Migration preserves Ticket count | Count and IDs preserved | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-62 | Regression | AC-20 | Migration preserves Attachment relations | Attachments still point to valid Tickets | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-63 | Regression | AC-20 | Migration preserves requester ownership | Each migrated Ticket maps to original Requester | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-64 | Migration | AC-21 | Run migration/seed twice | No duplicates or destructive change | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-65 | Integrity | AC-25 | Status update under concurrent stale state | No invalid silent overwrite | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-66 | Integrity | AC-25 | Last-admin safety in transaction | Cannot commit zero active Admins | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-56b | API | AC-18 | Change role of last active Admin away from ADMINISTRATOR | 409 Conflict; role demotion rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |

## 4. Unit Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | Password policy boundary | Auth - Password policy boundary | 7 rejected, 8 accepted, 128 accepted, 129 rejected; upper/lower/number/special required | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-02 | Unit | Password confirmation | Auth - Password confirmation | Mismatch rejected | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-03 | Unit | New password differs | Auth - New password differs | Same password rejected | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-04 | Unit | Email normalization | Auth - Email normalization | Canonical lowercase/trim behavior | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-05 | Unit | Role validation | Auth - Role validation | Only three Lab 3 roles accepted | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-06 | Unit | Safe login error mapping | Auth - Safe login error mapping | Bad/inactive/unknown map to safe response | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-07 | Unit | Requester ownership rule | Authorization - Requester ownership rule | Only authenticated owner passes | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| UNIT-08 | Unit | Staff-only rule | Authorization - Staff-only rule | Requester denied for Staff/Admin internal notes operation | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| UNIT-09 | Unit | Admin-only rule | Authorization - Admin-only rule | Requester/Staff denied for Admin APIs | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| UNIT-10 | Unit | IT Priority initialization | Ticket - IT Priority initialization | Missing IT Priority copies Requested Priority | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| UNIT-11 | Unit | Status matrix | Ticket - Status matrix | Allowed transitions return true | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| UNIT-12 | Unit | Status matrix | Ticket - Status matrix | All unspecified transitions return false | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| UNIT-13 | Unit | Requester resolution flag | Ticket - Requester resolution flag | Does not modify formal status | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| UNIT-14 | Unit | Content validation | Comments - Content validation | Trim, reject blank, max 4000 | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| UNIT-15 | Unit | Self deactivation | Admin - Self deactivation | Rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| UNIT-16 | Unit | Last active Admin | Admin - Last active Admin | Rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| UNIT-17 | Unit | Expiry logic | Session - Expiry logic | Idle/absolute timeout correctly rejects session | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-18 | Unit | Revocation | Session - Revocation | Revoked session cannot authenticate | `server/tests/lab-03/auth.api.test.ts` | Pass |
| UNIT-16b | Unit | Admin safety | Admin - Last active Admin role demotion | Rejected with safety error | `server/tests/lab-03/users-admin.api.test.ts` | Pass |

## 5. UI Component Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | AC-22 | Login - renders email/password/sign-in controls. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | UI | AC-22 | Login - blocks submit with missing required fields. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-03 | UI | AC-22 | Login - disables duplicate submission while busy. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-04 | UI | AC-22 | Login - displays generic invalid/inactive account failure. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-05 | UI | AC-22 | Login - first-login response routes to Change Password. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-06 | UI | AC-22 | Login - standard response routes to role landing page. | Component renders and behaves correctly | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-07 | UI | AC-22 | Change Password - renders new/confirmation inputs and save. | Component renders and behaves correctly | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-08 | UI | AC-22 | Change Password - displays password validation. | Component renders and behaves correctly | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-09 | UI | AC-22 | Change Password - blocks mismatch. | Component renders and behaves correctly | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-10 | UI | AC-22 | Change Password - prevents navigating into normal application while forced change remains. | Component renders and behaves correctly | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-11 | UI | AC-22 | Change Password - success transitions to normal role shell. | Component renders and behaves correctly | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-12 | UI | AC-22 | Staff Queue - renders required queue columns. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-13 | UI | AC-22 | Staff Queue - renders search, filters, sort, pagination. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-14 | UI | AC-22 | Staff Queue - renders assigned/unassigned and status/priority badges. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-15 | UI | AC-22 | Staff Queue - loading state. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-16 | UI | AC-22 | Staff Queue - empty state (MUST handle `totalPages` = 0 without crashing). | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-17 | UI | AC-22 | Staff Queue - no-results state. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-18 | UI | AC-22 | Staff Queue - failure state. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-19 | UI | AC-22 | Staff Queue - mobile card representation. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-20 | UI | AC-22 | Staff Detail - renders owner, IT Priority, status, comments, notes, attachments. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-21 | UI | AC-22 | Staff Detail - Claim/Reassign controls appear only for Staff UI. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-22 | UI | AC-22 | Staff Detail - invalid status transitions are not presented as actions. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-23 | UI | AC-22 | Staff Detail - confirmation shown for Resolved/Closed/Cancelled. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-24 | UI | AC-22 | Staff Detail - Public Comments and Internal Notes are visually distinct. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-25 | UI | AC-22 | Staff Detail - Requester resolution indicator is informational only. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-26 | UI | AC-22 | Staff Detail - save busy/success/failure feedback. | Component renders and behaves correctly | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-27 | UI | AC-22 | User Management - renders Name/Email/Role/Status/Edit. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-28 | UI | AC-22 | User Management - search and optional role filter. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-29 | UI | AC-22 | User Management - create form. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-30 | UI | AC-22 | User Management - edit form. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-31 | UI | AC-22 | User Management - duplicate-email validation. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-32 | UI | AC-22 | User Management - self-deactivation is visibly unavailable/rejected. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-33 | UI | AC-22 | User Management - last-active-Admin safety feedback. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-34 | UI | AC-22 | User Management - new-initial-password flow feedback. | Component renders and behaves correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |

## 6. UI Style / Responsive / Accessibility Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI/Style | AC-23 | All Lab 3 screens use existing Zen Green tokens/components. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-02 | UI/Style | AC-23 | No unauthorized navigation destination is rendered. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-03 | UI/Style | AC-23 | Status/Priority/Role badges are consistent. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-04 | UI/Style | AC-23 | Editable vs read-only controls are visually distinct. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-05 | UI/Style | AC-23 | Public Comments vs Internal Notes have unmistakable visual separation. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-06 | UI/Style | AC-23 | Focus indicators remain visible. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-07 | UI/Style | AC-23 | Validation placement follows Lab 2 convention. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-08 | UI/Style | AC-23 | Desktop screenshots contain no clipping/overlap. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-09 | UI/Style | AC-23 | Tablet screenshots contain no clipping/overlap. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-10 | UI/Style | AC-23 | Mobile screenshots contain no unintended horizontal overflow. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-11 | UI/Style | AC-23 | Queue switches from table to readable card representation on narrow screens. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| STYLE-12 | UI/Style | AC-23 | Required information remains legible without extreme zoom. | Meets Zen Green visual and responsive specs | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |

## 7. E2E Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-24 | valid active login -> correct role shell. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-24 | initial password login -> forced Change Password -> normal app only after success. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-03 | E2E | AC-24 | invalid password -> safe error. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-04 | E2E | AC-24 | inactive account -> safe error. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-05 | E2E | AC-24 | Logout -> direct access to protected route/API blocked. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-06 | E2E | AC-24 | role navigation differs correctly among Requester, Staff, Admin. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-07 | E2E | AC-24 | Requester cannot reach Internal Notes. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-08 | E2E | AC-24 | forced-password user cannot bypass Change Password through direct URL. | Workflow passes end-to-end on real database | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-09 | E2E | AC-24 | Staff opens Queue with seeded realistic data. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-10 | E2E | AC-24 | Search/filter/sort/pagination update displayed results (MUST verify all 8 statuses including `OPEN` and `CLOSED`). | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-11 | E2E | AC-24 | Staff opens Ticket Detail. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-12 | E2E | AC-24 | Staff claims unassigned Ticket. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-13 | E2E | AC-24 | Staff reassigns Ticket to another active Staff. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-14 | E2E | AC-24 | Staff changes IT Priority while Requested Priority remains unchanged. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-15 | E2E | AC-24 | Staff performs valid status transition. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-16 | E2E | AC-24 | UI blocks/does not offer invalid status transition. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-17 | E2E | AC-24 | Staff posts Public Comment and sees it persisted after reload. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-18 | E2E | AC-24 | Staff posts Internal Note and sees it persisted after reload. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-19 | E2E | AC-24 | Requester sees Public Comment but not Internal Note. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-20 | E2E | AC-24 | Requester clicks Problem Appears Resolved; Ticket does not become Resolved/Closed. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-21 | E2E | AC-24 | Existing Attachments remain available. | Workflow passes end-to-end on real database | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-22 | E2E | AC-24 | Admin lists users. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-23 | E2E | AC-24 | Admin searches by name/email. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-24 | E2E | AC-24 | Admin optionally filters one role. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-25 | E2E | AC-24 | Admin creates user and persisted account can log in. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-26 | E2E | AC-24 | Created user is forced to change initial password. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-27 | E2E | AC-24 | Duplicate email is rejected. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-28 | E2E | AC-24 | Admin edits name/email/role/activation. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-29 | E2E | AC-24 | Admin sets new initial password; next login requires change. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-30 | E2E | AC-24 | Admin cannot deactivate self. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-31 | E2E | AC-24 | Admin cannot remove last active Administrator. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-32 | E2E | AC-24 | Requester/Staff direct access to User Management is forbidden. | Workflow passes end-to-end on real database | `e2e/lab-03/user-administration.spec.ts` | Pass |

## 8. Security Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Security | AC-25 | Password hashes are persisted but never returned | No password hash in API response bodies | `server/tests/lab-03/auth.api.test.ts` | Pass |
| SEC-02 | Security | AC-25 | Raw passwords do not appear in structured logs | Logs contain sanitized payloads without plain credentials | `server/tests/lab-03/auth.api.test.ts` | Pass |
| SEC-03 | Security | AC-25 | Session token never appears in API response bodies | Opaque session token only transmitted via HttpOnly cookie | `server/tests/lab-03/auth.api.test.ts` | Pass |
| SEC-04 | Security | AC-25 | Session cookie has required security attributes | HttpOnly=true, SameSite=Lax, Path=/ | `server/tests/lab-03/auth.api.test.ts` | Pass |
| SEC-05 | Security | AC-25 | Session token is not stored in localStorage/sessionStorage | Client state uses memory context without web storage tokens | `client/tests/lab-03/Login.test.tsx` | Pass |
| SEC-06 | Security | AC-25 | Direct API calls from incorrect roles are rejected | 403 Forbidden on role mismatch | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-07 | Security | AC-25 | Client-supplied requesterId cannot override ownership | Server derives ownership strictly from authenticated session | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-08 | Security | AC-25 | Ticket/Attachment/Note unauthorized access does not leak existence | 404 Not Found without leaking existence disclosure | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-09 | Security | AC-25 | Comments/notes reject HTML execution by safe rendering | User input rendered strictly as text, escaping script tags | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| SEC-10 | Security | AC-25 | Invalid status/owner updates do not partially mutate database state | Transactional rollback on validation or permission failure | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| SEC-11 | Security | AC-25 | Last-active-Administrator rule is atomic | Cannot commit transaction leaving zero active Admins | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| SEC-12 | Security | AC-25 | Existing user sessions are revoked after deactivation or forced-password reset | Subsequent requests with prior session return 401 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| SEC-13 | Security | AC-25 | Mutating request missing CSRF token rejected | 403 Forbidden for state-changing request without CSRF token | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-14 | Security | AC-25 | Mutating request with invalid CSRF token rejected | 403 Forbidden for forged/invalid CSRF token | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-15 | Security | AC-25 | Cross-origin mutating request rejected | 403 Forbidden when Origin header does not match host | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-16 | Security | AC-25 | Valid CSRF token and same-origin mutating request accepted | Request processed successfully with valid session and token | `server/tests/lab-03/authorization.api.test.ts` | Pass |

## 9. Migration / Regression Evidence

Before migration:
- record counts for Users/requesters as available, Tickets, Attachments, Categories, Related Systems.

After migration:
- same Ticket/Attachment counts;
- same Ticket IDs and Attachment relationships;
- every Ticket has correct migrated Requester;
- IT Priority initialized where previously absent;
- no duplicate Users from repeated migration.

Regression:
- all Lab 2 Requester Ticket creation/view/update paths pass using authenticated identity;
- all Lab 2 Attachment ownership paths pass;
- Development Requester selector no longer exists in UI/code path used by Requesters.

## 10. Test Data Rules

Use a disposable test database.

Required fixtures:
- 4+ active Requesters: `requester1@toktickit.com`, `requester2@toktickit.com`, `requester3@toktickit.com`, `requester4@toktickit.com` (Default password: `Password123!`)
- 1 inactive Requester: `requester.inactive@toktickit.com` (Default password: `Password123!`)
- 3+ active Staff: `staff1@toktickit.com`, `staff2@toktickit.com`, `staff3@toktickit.com` (Default password: `Password123!`)
- 1 inactive Staff: `staff.inactive@toktickit.com` (Default password: `Password123!`)
- 1+ active Admin: `admin@toktickit.com` (Default password: `Password123!`)
- 1 initial password test account: `firstlogin@toktickit.com` (Password: `Password123!`, `mustChangePassword=true`)
- Tickets covering every status, Requested/IT Priority combination needed by transition tests, assigned/unassigned ownership;
- Public Comments and Internal Notes.

Test passwords are generated/configured for tests and are not real personal credentials.

## 11. Traceability Matrix

| AC | Covered by |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-05..08, E2E-02, E2E-08 |
| AC-03 | API-02..04, E2E-03..04 |
| AC-04 | API-08, API-16, E2E-07 |
| AC-04b | API-10..11, E2E-05 |
| AC-05 | API-09, API-12 |
| AC-06 | API-13, API-17 |
| AC-07 | API-14..16, E2E-07 |
| AC-08 | API-20..26, E2E-09..10 |
| AC-09 | API-28..31, E2E-12..13 |
| AC-10 | API-32..33, E2E-14 |
| AC-11 | API-34..36, E2E-15..16 |
| AC-12 | API-37, E2E-20 |
| AC-13 | API-38..41, E2E-17, E2E-19 |
| AC-14 | API-42..45, E2E-18..19 |
| AC-15 | API-46, E2E-32 |
| AC-16 | API-47..51, API-54, E2E-22..26, E2E-28 |
| AC-17 | API-52..53, E2E-27 |
| AC-18 | API-55..57, E2E-30..31 |
| AC-19 | API-58..60, E2E-26, E2E-29 |
| AC-20 | API-17..19, API-61..63, E2E-21 |
| AC-21 | API-64 |
| AC-22 | UI-15..18, UI-26, STYLE-* |
| AC-23 | STYLE-08..12 |
| AC-24 | All test groups in this document |
| AC-25 | API-13..16, API-29, API-34..36, API-65..66, Security Tests |

## 12. Required Final Evidence

The final main branch should provide:
- all listed test files;
- passing automated output;
- migration/seed evidence;
- direct API authorization evidence;
- E2E evidence;
- desktop/tablet/mobile screenshots;
- traceability from acceptance criteria to tests.

A test result marked “Pass” is valid only when the test ran against the implemented Lab 3 code and real test persistence for database-backed requirements.
