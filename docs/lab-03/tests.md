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
- `client/.../lab-03 tests/Login.test.tsx`
- `client/.../lab-03 tests/ChangePassword.test.tsx`
- `client/.../lab-03 tests/StaffTicketQueue.test.tsx`
- `client/.../lab-03 tests/StaffTicketDetail.test.tsx`
- `client/.../lab-03 tests/UserManagement.test.tsx`

Required E2E:
- `e2e/lab-03/authentication.spec.ts`
- `e2e/lab-03/staff-ticket-flow.spec.ts`
- `e2e/lab-03/user-administration.spec.ts`

Test data should use a disposable test database and real application persistence.

## 3. API / Integration Tests

| ID | Type | AC | What it tests | Expected result |
|---|---|---|---|---|
| API-01 | API | AC-01 | Active user valid login | 200, authenticated session, safe user + role |
| API-02 | API | AC-03 | Wrong password | 401, generic safe error |
| API-03 | API | AC-03 | Unknown email | Same safe failure class/message as wrong password |
| API-04 | API | AC-03 | Inactive user login | 401, generic safe error |
| API-05 | API | AC-02 | Initial-password login | Restricted session, `mustChangePassword=true` |
| API-06 | API | AC-02 | Forced session calls normal Ticket API | 403 |
| API-07 | API | AC-02 | Invalid new password | 422/400, password unchanged |
| API-08 | API | AC-02 | Successful first-login password change | `mustChangePassword=false`, normal access allowed |
| API-09 | API | AC-05 | `/auth/me` response | No passwordHash/session token |
| API-10 | API | AC-04 | Logout | Session revoked and cookie cleared |
| API-11 | Security | AC-04 | Reuse old session after logout | 401 |
| API-12 | Security | AC-05 | Credentials in error/log payloads | No credentials/secrets |
| API-13 | Security | AC-06 | Requester sends alternate requesterId | Authenticated identity still determines Ticket ownership |
| API-14 | Security | AC-07 | Requester reads another user's Ticket | 404/403 without protected data |
| API-15 | Security | AC-07 | Requester reads another user's Attachment | 404/403 without protected data |
| API-16 | Security | AC-07 | Requester calls Internal Notes | Forbidden and no note data |
| API-17 | Regression | AC-20 | Requester creates Ticket through authenticated identity | Persisted requester ID equals authenticated user |
| API-18 | Regression | AC-20 | Existing Ticket retrieval | Old Ticket still available to correct Requester |
| API-19 | Regression | AC-20 | Existing Attachment flow | Existing Attachment ownership behavior preserved |
| API-20 | API | AC-08 | Staff queue default | Correct default ordering and pagination |
| API-21 | API | AC-08 | Queue search by Ticket Number | Matching records only |
| API-22 | API | AC-08 | Queue search by Summary | Matching records only |
| API-23 | API | AC-08 | Queue filters | Each specified filter returns correct set |
| API-24 | API | AC-08 | Queue sort fields | Requested sort field/order applied |
| API-25 | API | AC-08 | Queue pagination | Correct page/pageSize/metadata |
| API-26 | API | AC-08 | Invalid queue params | 400 and no unsafe query behavior |
| API-27 | Security | AC-08 | Requester accesses staff queue | 403 |
| API-28 | API | AC-09 | Claim unassigned Ticket | Owner becomes authenticated IT Staff in DB |
| API-29 | API | AC-09 | Claim already-owned Ticket | 409, existing owner unchanged |
| API-30 | API | AC-09 | Assign to active IT Staff | Owner changes correctly |
| API-31 | API | AC-09 | Assign to inactive Staff | Rejected, owner unchanged |
| API-32 | API | AC-10 | Change IT Priority | IT Priority changes |
| API-33 | API | AC-10 | Requested Priority preservation | Requested Priority unchanged |
| API-34 | API | AC-11 | Each allowed status transition | Persisted state changes |
| API-35 | API | AC-11 | Every forbidden transition | Rejected with no mutation |
| API-36 | Security | AC-11 | Requester attempts status change | Rejected |
| API-37 | API | AC-12 | Problem Appears Resolved | Timestamp stored, formal status unchanged |
| API-38 | API | AC-13 | Public Comment create | Persisted with backend author/time |
| API-39 | API | AC-13 | Public Comment empty/whitespace | Rejected |
| API-40 | API | AC-13 | Public Comment >4000 chars | Rejected |
| API-41 | API | AC-13 | Public Comment retrieval | Authorized viewer sees comments |
| API-42 | API | AC-14 | Internal Note create | Persisted for IT Staff |
| API-43 | API | AC-14 | Internal Note empty/whitespace | Rejected |
| API-44 | Security | AC-14 | Requester retrieves Internal Notes | Rejected; no content |
| API-45 | API | AC-14 | Internal Notes retrieval for Staff | Only note data visible |
| API-46 | API | AC-15 | Non-Admin user list | 403 |
| API-47 | API | AC-16 | Admin lists users | Safe list fields |
| API-48 | API | AC-16 | Search by name | Correct results |
| API-49 | API | AC-16 | Search by email | Correct results |
| API-50 | API | AC-16 | Role filter | Correct role only |
| API-51 | API | AC-16 | Create user | User persisted with one role + forced password change |
| API-52 | API | AC-17 | Duplicate email, case/whitespace variants | 409 and no duplicate row |
| API-53 | API | AC-17 | Invalid role | Rejected |
| API-54 | API | AC-16 | Edit basic account fields | Persisted changes |
| API-55 | API | AC-18 | Self-deactivation | 409; self remains active |
| API-56 | API | AC-18 | Deactivate last active Admin | 409; Administrator remains active |
| API-57 | API | AC-16 | Deactivate another user | User becomes inactive; sessions revoked |
| API-58 | API | AC-19 | Set initial password | Hash changes, mustChangePassword=true |
| API-59 | API | AC-19 | Initial password login after reset | Forced change |
| API-60 | Security | AC-19 | Existing target sessions after reset | Revoked |
| API-61 | Regression | AC-20 | Migration preserves Ticket count | Count and IDs preserved |
| API-62 | Regression | AC-20 | Migration preserves Attachment relations | Attachments still point to valid Tickets |
| API-63 | Regression | AC-20 | Migration preserves requester ownership | Each migrated Ticket maps to original Requester |
| API-64 | Migration | AC-21 | Run migration/seed twice | No duplicates or destructive change |
| API-65 | Integrity | AC-25 | Status update under concurrent stale state | No invalid silent overwrite |
| API-66 | Integrity | AC-25 | Last-admin safety in transaction | Cannot commit zero active Admins |

## 4. Unit Tests

| ID | Area | Requirement | Expected |
|---|---|---|---|
| UNIT-01 | Auth | Password policy boundary | 11 rejected, 12 accepted, 128 accepted, 129 rejected |
| UNIT-02 | Auth | Password confirmation | Mismatch rejected |
| UNIT-03 | Auth | New password differs | Same password rejected |
| UNIT-04 | Auth | Email normalization | Canonical lowercase/trim behavior |
| UNIT-05 | Auth | Role validation | Only three Lab 3 roles accepted |
| UNIT-06 | Auth | Safe login error mapping | Bad/inactive/unknown map to safe response |
| UNIT-07 | Authorization | Requester ownership rule | Only authenticated owner passes |
| UNIT-08 | Authorization | Staff-only rule | Requester/Admin denied for Staff-only operation |
| UNIT-09 | Authorization | Admin-only rule | Requester/Staff denied for Admin APIs |
| UNIT-10 | Ticket | IT Priority initialization | Missing IT Priority copies Requested Priority |
| UNIT-11 | Ticket | Status matrix | Allowed transitions return true |
| UNIT-12 | Ticket | Status matrix | All unspecified transitions return false |
| UNIT-13 | Ticket | Requester resolution flag | Does not modify formal status |
| UNIT-14 | Comments | Content validation | Trim, reject blank, max 4000 |
| UNIT-15 | Admin | Self deactivation | Rejected |
| UNIT-16 | Admin | Last active Admin | Rejected |
| UNIT-17 | Session | Expiry logic | Idle/absolute timeout correctly rejects session |
| UNIT-18 | Session | Revocation | Revoked session cannot authenticate |

## 5. UI Component Tests

### Login

- **UI-01** renders email/password/sign-in controls.
- **UI-02** blocks submit with missing required fields.
- **UI-03** disables duplicate submission while busy.
- **UI-04** displays generic invalid/inactive account failure.
- **UI-05** first-login response routes to Change Password.
- **UI-06** standard response routes to role landing page.

### Change Password

- **UI-07** renders new/confirmation inputs and save.
- **UI-08** displays password validation.
- **UI-09** blocks mismatch.
- **UI-10** prevents navigating into normal application while forced change remains.
- **UI-11** success transitions to normal role shell.

### Staff Queue

- **UI-12** renders required queue columns.
- **UI-13** renders search, filters, sort, pagination.
- **UI-14** renders assigned/unassigned and status/priority badges.
- **UI-15** loading state.
- **UI-16** empty state (MUST handle `totalPages` = 0 without crashing).
- **UI-17** no-results state.
- **UI-18** failure state.
- **UI-19** mobile card representation.

### Staff Detail

- **UI-20** renders owner, IT Priority, status, comments, notes, attachments.
- **UI-21** Claim/Reassign controls appear only for Staff UI.
- **UI-22** invalid status transitions are not presented as actions.
- **UI-23** confirmation shown for Resolved/Closed/Cancelled.
- **UI-24** Public Comments and Internal Notes are visually distinct.
- **UI-25** Requester resolution indicator is informational only.
- **UI-26** save busy/success/failure feedback.

### User Management

- **UI-27** renders Name/Email/Role/Status/Edit.
- **UI-28** search and optional role filter.
- **UI-29** create form.
- **UI-30** edit form.
- **UI-31** duplicate-email validation.
- **UI-32** self-deactivation is visibly unavailable/rejected.
- **UI-33** last-active-Admin safety feedback.
- **UI-34** new-initial-password flow feedback.

## 6. UI Style / Responsive / Accessibility Tests

- **STYLE-01** All Lab 3 screens use existing Zen Green tokens/components.
- **STYLE-02** No unauthorized navigation destination is rendered.
- **STYLE-03** Status/Priority/Role badges are consistent.
- **STYLE-04** Editable vs read-only controls are visually distinct.
- **STYLE-05** Public Comments vs Internal Notes have unmistakable visual separation.
- **STYLE-06** Focus indicators remain visible.
- **STYLE-07** Validation placement follows Lab 2 convention.
- **STYLE-08** Desktop screenshots contain no clipping/overlap.
- **STYLE-09** Tablet screenshots contain no clipping/overlap.
- **STYLE-10** Mobile screenshots contain no unintended horizontal overflow.
- **STYLE-11** Queue switches from table to readable card representation on narrow screens.
- **STYLE-12** Required information remains legible without extreme zoom.

## 7. E2E Tests

### `e2e/lab-03/authentication.spec.ts`

- **E2E-01** valid active login -> correct role shell.
- **E2E-02** initial password login -> forced Change Password -> normal app only after success.
- **E2E-03** invalid password -> safe error.
- **E2E-04** inactive account -> safe error.
- **E2E-05** Logout -> direct access to protected route/API blocked.
- **E2E-06** role navigation differs correctly among Requester, Staff, Admin.
- **E2E-07** Requester cannot reach Internal Notes.
- **E2E-08** forced-password user cannot bypass Change Password through direct URL.

### `e2e/lab-03/staff-ticket-flow.spec.ts`

- **E2E-09** Staff opens Queue with seeded realistic data.
- **E2E-10** Search/filter/sort/pagination update displayed results (MUST verify all 8 statuses including `OPEN` and `CLOSED`).
- **E2E-11** Staff opens Ticket Detail.
- **E2E-12** Staff claims unassigned Ticket.
- **E2E-13** Staff reassigns Ticket to another active Staff.
- **E2E-14** Staff changes IT Priority while Requested Priority remains unchanged.
- **E2E-15** Staff performs valid status transition.
- **E2E-16** UI blocks/does not offer invalid status transition.
- **E2E-17** Staff posts Public Comment and sees it persisted after reload.
- **E2E-18** Staff posts Internal Note and sees it persisted after reload.
- **E2E-19** Requester sees Public Comment but not Internal Note.
- **E2E-20** Requester clicks Problem Appears Resolved; Ticket does not become Resolved/Closed.
- **E2E-21** Existing Attachments remain available.

### `e2e/lab-03/user-administration.spec.ts`

- **E2E-22** Admin lists users.
- **E2E-23** Admin searches by name/email.
- **E2E-24** Admin optionally filters one role.
- **E2E-25** Admin creates user and persisted account can log in.
- **E2E-26** Created user is forced to change initial password.
- **E2E-27** Duplicate email is rejected.
- **E2E-28** Admin edits name/email/role/activation.
- **E2E-29** Admin sets new initial password; next login requires change.
- **E2E-30** Admin cannot deactivate self.
- **E2E-31** Admin cannot remove last active Administrator.
- **E2E-32** Requester/Staff direct access to User Management is forbidden.

## 8. Security Tests

1. Password hashes are persisted but never returned.
2. Raw passwords do not appear in structured logs.
3. Session token never appears in API response bodies.
4. Session cookie has required security attributes.
5. Session token is not stored in localStorage/sessionStorage.
6. Direct API calls from incorrect roles are rejected.
7. Client-supplied requesterId cannot override ownership.
8. Ticket/Attachment/Note unauthorized access does not leak content or existence.
9. Comments/notes reject HTML execution by safe rendering.
10. Invalid status/owner updates do not partially mutate database state.
11. Last-active-Administrator rule is atomic.
12. Existing user sessions are revoked after deactivation or forced-password reset.

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
- 4+ active Requesters;
- 1 inactive Requester;
- 3+ active Staff;
- 1 inactive Staff;
- 1+ active Admin;
- Tickets covering every status, Requested/IT Priority combination needed by transition tests, assigned/unassigned ownership;
- Public Comments and Internal Notes.

Test passwords are generated/configured for tests and are not real personal credentials.

## 11. Traceability Matrix

| AC | Covered by |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-05..08, E2E-02, E2E-08 |
| AC-03 | API-02..04, E2E-03..04 |
| AC-04 | API-10..11, E2E-05 |
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
