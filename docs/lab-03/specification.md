# Lab 3 Engineering Specification

## 1. Sprint Goal

Replace the temporary Development Requester selector with secure, real-user authentication and role-based authorization while preserving Lab 2 Requester Ticket and Attachment behavior. Add operational IT Staff ticket workflows and a minimalist Administrator User Management screen, using the existing Zen Green design system.

## 2. Stakeholder Request — Interpreted

The application must use real user accounts authenticated by email/password. First-login users with an initial password must change it before accessing normal application screens. Requesters continue to manage only their own Lab 2 tickets using the authenticated identity. IT Staff receive a queue and ticket-detail workflow for ownership, priority, status, public communication, and private internal notes. Administrators manage user accounts only within the minimum Lab 3 scope. All authorization must be enforced by the backend.

## 3. Scope

### 3.1 Included

- Real login, logout, current-user retrieval, and mandatory first-login password change.
- Three and only three Lab 3 roles: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- Server-side role authorization and Requester ownership checks.
- Migration from Lab 2 Development Requester identity to real `User`.
- Preservation of existing Categories, Related Systems, Tickets, and Attachments.
- IT Staff Queue with search, filters, sorting, and pagination.
- IT Staff Ticket Detail with ownership, IT Priority, permitted status transitions, Public Comments, Internal Notes, and Attachment continuity.
- Requester Public Comments and “Problem Appears Resolved”.
- Minimalist Administrator User Management: list, search, optional role filter, create, edit, activate/deactivate, set new initial password.
- Idempotent local seed data.
- REST API documentation and complete automated/UI/E2E testing.
- Zen Green visual, responsive, and accessibility continuity from Lab 2.

### 3.2 Explicitly Excluded

Email invitations, password-reset email, MFA, social login, SSO, self-registration, Requester-created accounts, Actions Taken, formal SLA/escalation/notifications, dashboards/KPIs beyond simple queue counts, multi-tenant structures, production/cloud infrastructure changes, multiple roles per user, user deletion, bulk operations, import/export, account-history screens, extended profiles, email delivery of initial passwords/reset links, account unlocking, approval workflows, advanced identity management, mandatory user-list pagination, multi-column sorting, and multiple simultaneous user-list filters.

## 4. Non-Regression / Scope Isolation Rules

1. Existing code is additive unless this specification explicitly marks a component as superseded.
2. The Lab 2 Development Requester selector and Change Requester action are explicitly superseded and MUST be removed.
3. Existing Lab 2 Ticket and Attachment behaviors not contradicted by this specification MUST remain unchanged.
4. Existing data MUST NOT be discarded during migration.
5. Existing public API behavior may only change where required to remove client-supplied Requester identity and enforce authenticated ownership.
6. No unrelated refactor, rename, dependency replacement, styling-system replacement, or architecture rewrite is permitted.
7. Every modified existing behavior MUST have a corresponding regression test.

## 5. Functional Requirements

### Authentication

- **FR-01** The system MUST authenticate users with email address and password.
- **FR-02** Only active users with valid credentials may obtain normal authenticated access.
- **FR-03** A successful login for `mustChangePassword=true` MUST establish only a restricted first-login session that can access password-change endpoints/screens, not normal application resources.
- **FR-04** A valid first-login password change MUST clear `mustChangePassword` and allow normal application access.
- **FR-05** The system MUST provide logout that invalidates the current authenticated session.
- **FR-06** The system MUST provide a current-user endpoint returning the authenticated user's safe identity and role.
- **FR-07** Authentication failures MUST use safe, non-enumerating messages.
- **FR-08** Passwords MUST be hashed using a modern adaptive password hashing algorithm supported by the course stack; plaintext or reversible password storage is prohibited.

### Authorization

- **FR-09** All protected API operations MUST enforce authorization server-side.
- **FR-10** The UI MUST render only role-permitted navigation/actions, but hidden UI MUST NOT be treated as authorization.
- **FR-11** Requester Ticket and Attachment operations MUST derive ownership from the authenticated User, never from a client-controlled `requesterId`.
- **FR-12** Internal Notes MUST be inaccessible to Requesters.
- **FR-13** Administrator User Management APIs MUST reject non-Administrators.

### Requester

- **FR-14** A Requester MUST be able to create Tickets using the authenticated identity.
- **FR-15** A Requester MUST be able to view/manage only owned Tickets and permitted Attachments.
- **FR-16** A Requester MUST be able to create and retrieve Public Comments on owned Tickets.
- **FR-17** A Requester MUST be able to indicate that the problem appears resolved.
- **FR-18** A Requester MUST NOT directly set a Ticket to `Resolved` or `Closed`.

### IT Staff

- **FR-19** IT Staff MUST be able to retrieve a Ticket Queue with search, filters, sorting, and pagination.
- **FR-20** IT Staff MUST be able to open Ticket Detail.
- **FR-21** IT Staff MUST be able to claim, assign, and reassign Ticket ownership.
- **FR-22** IT Staff MUST be able to update IT Priority.
- **FR-23** IT Staff MUST be able to perform only permitted Ticket status transitions.
- **FR-24** IT Staff MUST be able to create/retrieve Public Comments.
- **FR-25** IT Staff MUST be able to create/retrieve Internal Notes.

### Administrator

- **FR-26** An Administrator MUST be able to list users showing Name, Email, Role, Status, and Edit action.
- **FR-27** An Administrator MUST be able to search users by name or email.
- **FR-28** An Administrator MAY filter the User list by one role.
- **FR-29** An Administrator MUST be able to create a user with name, email, one role, activation state, and initial password.
- **FR-30** An Administrator MUST be able to edit name, email, role, and activation state.
- **FR-31** An Administrator MUST be able to set a new initial password that forces password change at next login.
- **FR-32** Duplicate email addresses and invalid roles MUST be rejected.
- **FR-33** Administrators MUST NOT delete users.

### Comments / Notes

- **FR-34** Public Comments and Internal Notes MUST be append-only in Lab 3.
- **FR-35** Each entry MUST record backend-derived author and creation time.
- **FR-36** Empty or whitespace-only comment/note content MUST be rejected.
- **FR-37** Public Comments MUST be visible to Requester, IT Staff, and Administrator.
- **FR-38** Internal Notes MUST be visible only to IT Staff and Administrator.

## 6. Business Rules

### Identity and Access

- **BR-01** Only an active user with valid credentials may authenticate.
- **BR-02** A user with `mustChangePassword=true` cannot enter normal application resources until a valid new password is saved.
- **BR-03** Authenticated identity, not a client-supplied requesterId, determines Requester ownership.
- **BR-04** Inactive users cannot log in and existing sessions are rejected once inactivity is detected.
- **BR-05** Login failure responses MUST not reveal whether the email exists or whether the account is inactive.
- **BR-06** Passwords are never returned by any API and are never written to logs.
- **BR-07** Password confirmation is required on password creation/change screens but is never persisted.
- **BR-08** Email addresses are normalized before uniqueness checking and storage: trim surrounding whitespace and compare/store in canonical lowercase.
- **BR-09** A User has exactly one role.
- **BR-10** Only `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR` are valid role values.
- **BR-11** Logout invalidates the current session; reusing the invalidated session is rejected.
- **BR-12** Normal authenticated sessions expire after 8 hours of inactivity and no later than 24 hours after creation. First-login restricted sessions use the same absolute timeout.

### Password Policy

- **BR-13** Passwords MUST be 12–128 Unicode characters after trimming outer whitespace; leading/trailing whitespace is not part of the password.
- **BR-14** A new password MUST differ from the current password.
- **BR-15** Passwords are hashed with Argon2id (preferred) or the strongest equivalent supported by the course stack; the selected implementation MUST use a unique salt per password.
- **BR-16** Seed passwords are local-development credentials only and MUST come from environment/configuration outside committed source code.
- **BR-17** Setting a new initial password sets `mustChangePassword=true` and invalidates existing sessions for that user.

### Requester Ownership

- **BR-18** A Requester may access only Tickets owned/submitted by their User ID.
- **BR-19** A Requester cannot access another Requester's Ticket, Attachments, Internal Notes, or protected metadata even if an identifier is guessed.
- **BR-20** Ownership failures for protected Ticket/Attachment resources MUST not disclose whether another user's resource exists.
- **BR-21** A Requester-created Ticket stores the authenticated Requester as its requester/owner identity.
- **BR-22** “Problem Appears Resolved” records a backend timestamp/flag on the Ticket; it does not change Ticket status.
- **BR-23** Only IT Staff may perform formal Ticket workflow operations defined in the IT Staff matrix below. Administrators do not automatically receive IT Staff operations.

### Ticket Ownership / Priority / Status

- **BR-24** Each Ticket has zero or one primary Ticket Owner.
- **BR-25** A Ticket Owner MUST be an active `IT_STAFF` user. To preserve conceptual separation, this specification deliberately does not assign Tickets to Administrators.
- **BR-26** Claiming an unassigned Ticket assigns it to the authenticated IT Staff user.
- **BR-27** Assign/reassign MUST target an active IT Staff user.
- **BR-28** Requester-submitted Requested Priority remains unchanged by IT Staff operations.
- **BR-29** IT Priority initially equals Requested Priority when the Ticket is created/migrated if no existing IT Priority exists.
- **BR-30** Only IT Staff may change IT Priority.
- **BR-31** Required statuses are exactly: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
- **BR-32** Requesters may not directly modify Ticket status.
- **BR-33** Only IT Staff may perform the status transitions in the approved matrix.
- **BR-34** Status transitions must be validated server-side against current persisted state.
- **BR-35** `Resolved` and `Closed` are formal IT outcomes; a Requester resolution indication is not equivalent.
- **BR-36** `Closed` Tickets may only transition to `Reopened`; reopening returns work to `In Progress`.
- **BR-37** `Cancelled` is terminal in Lab 3.
- **BR-38** Any status transition that requires a target Ticket or permission failure MUST be rejected without changing persisted state.

### Approved Ticket Status Matrix

| Current | Allowed next | Role | Required confirmation |
|---|---|---|---|
| New | Open, Cancelled | IT Staff | Cancelled requires explicit UI confirmation |
| Open | In Progress, Waiting for Requester, Cancelled | IT Staff | Cancelled requires explicit UI confirmation |
| In Progress | Waiting for Requester, Resolved, Cancelled | IT Staff | Resolved requires explicit confirmation |
| Waiting for Requester | In Progress, Resolved, Cancelled | IT Staff | Resolved requires explicit confirmation |
| Resolved | Closed, Reopened | IT Staff | Closed requires explicit confirmation |
| Closed | Reopened | IT Staff | Explicit confirmation |
| Reopened | In Progress, Waiting for Requester, Resolved, Cancelled | IT Staff | Resolved/Cancelled require explicit confirmation |
| Cancelled | none | IT Staff | Terminal |

No other transition is permitted.

### Comments and Notes

- **BR-39** Public Comments are visible to Requester, IT Staff, and Administrator when the viewer is otherwise authorized to view the Ticket.
- **BR-40** Internal Notes are visible only to IT Staff and Administrator users who are otherwise authorized to view the relevant Ticket. This rule does not grant Administrator Ticket operations by itself.
- **BR-41** Administrator responsibilities remain conceptually separate from IT Staff operations. The Lab 3 authorization matrix does not grant Administrator Ticket workflow operations; therefore no Administrator Ticket screen/API is required solely for Internal Note visibility.
- **BR-42** Comment/note content is trimmed before validation/storage.
- **BR-43** Content must contain at least one non-whitespace character and be at most 4000 characters.
- **BR-44** Entries are append-only; no edit/delete API is implemented.
- **BR-45** Author and creation time always come from the backend.
- **BR-46** User-provided text is rendered as text, not trusted HTML.

### Administrator Safety

- **BR-47** An Administrator may create exactly one role per user.
- **BR-48** An Administrator cannot assign an invalid role.
- **BR-49** An Administrator cannot deactivate their own account.
- **BR-50** The system must always retain at least one active Administrator.
- **BR-51** Deactivating the last active Administrator is rejected.
- **BR-52** User deactivation is represented by `isActive=false`; user deletion is not implemented.
- **BR-53** Changing a user's email to an email already belonging to another user is rejected.
- **BR-54** Setting a new initial password invalidates that user's previous sessions and forces password change at next login.
- **BR-55** Administrator APIs do not provide bulk operations, deletion, import/export, role history, or email delivery.

### Migration / Regression

- **BR-56** Existing Lab 2 Tickets and Attachments must remain addressable after migration.
- **BR-57** Every migrated Requester identity must map to exactly one User record.
- **BR-58** Existing Ticket requester ownership mappings must be preserved.
- **BR-59** The Development Requester selector and client-side identity state are removed after authenticated identity is integrated.
- **BR-60** The migration is repeat-safe for the migration environment and must fail rather than silently duplicate users or tickets.
- **BR-61** Seed execution is idempotent and safe to repeat.

## 7. Authorization Matrix

| Operation | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Login/logout/current-user | Yes | Yes | Yes |
| Change own forced password | Yes | Yes | Yes |
| Create own Ticket | Yes | No | No |
| View/manage own Ticket | Yes | No | No |
| View IT Staff Queue | No | Yes | No |
| Open any Ticket in Staff workflow | No | Yes | No |
| Claim/assign/reassign Ticket | No | Yes | No |
| Change IT Priority | No | Yes | No |
| Status transitions | No | Yes | No |
| Public Comments | Own Tickets | Any authorized staff Ticket | Only where the Administrator is otherwise authorized to view the Ticket |
| Internal Notes | No | Yes | Only where the Administrator is otherwise authorized to view the Ticket |
| User list/search/filter | No | No | Yes |
| Create user | No | No | Yes |
| Edit user | No | No | Yes |
| Activate/deactivate user | No | No | Yes, with safety rules |
| Set new initial password | No | No | Yes |
| Delete user | No | No | No |

## 8. Data Model Changes

### User

- `id` — UUID/DB-generated primary key.
- `name` — required string.
- `email` — required canonical lowercase string, unique index.
- `passwordHash` — required string; never exposed.
- `role` — enum/reference with exactly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- `isActive` — boolean, default true.
- `mustChangePassword` — boolean, default true for newly provisioned users unless the approved seed/test flow explicitly sets it false.
- `createdAt`, `updatedAt` — backend timestamps.

### Session

- `id` — UUID/DB-generated primary key.
- `userId` — FK to User.
- `tokenHash` — unique hash of opaque session token.
- `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`.
- Raw session tokens MUST NOT be stored.

### Ticket additive fields

- `ownerId` nullable FK to User for primary IT Staff owner.
- `itPriority` required after migration; initialize from Requested Priority if missing.
- `requesterResolvedAt` nullable timestamp (or equivalent boolean + timestamp design; the implementation MUST preserve the timestamp of first indication).
- `updatedAt` if not already present.
- Status enumeration extended/preserved to the required Lab 3 values without deleting valid historical data.

### PublicComment

- `id`, `ticketId`, `authorId`, `content`, `createdAt`.

### InternalNote

- `id`, `ticketId`, `authorId`, `content`, `createdAt`.

### Relationship constraints

- User 1-to-many submitted Tickets.
- User 1-to-many owned Tickets for IT Staff ownership.
- Ticket 1-to-many Public Comments.
- Ticket 1-to-many Internal Notes.
- Comment/Note each has exactly one author.
- Existing Categories, Related Systems, Tickets, and Attachments remain valid.

### Required indexes

At minimum:
- User unique index on canonical email.
- Ticket indexes for requester/user ownership and queue fields used by filtering/sorting.
- Comment/Note indexes on ticketId and createdAt.
- Session unique index on tokenHash and lookup indexes on userId/expiresAt.

The exact migration MUST be additive and preserve existing records.

## 9. Migration Plan

1. Back up or snapshot the local/test database before migration.
2. Create/extend User, Session, PublicComment, InternalNote structures and required Ticket fields.
3. Migrate each distinct Lab 2 Development Requester to one User with role `REQUESTER`.
4. Preserve Ticket requester relationships by mapping the existing requester identity to the new User ID.
5. Initialize missing IT Priority from Requested Priority.
6. Preserve Attachment foreign keys and file metadata unchanged.
7. Create active/inactive states and initial-password state for migrated users according to the documented local migration procedure.
8. Verify row counts and referential integrity.
9. Verify every migrated Ticket still resolves to the same Requester.
10. Only after successful migration, remove the Development Requester selector/client identity mechanism.
11. Run the migration and full regression suite twice in a disposable test database; the second run must not duplicate data.

## 10. Seed Requirements

The local seed MUST be idempotent and provide:
- at least 4 active Requesters and 1 inactive Requester;
- at least 3 active IT Staff and 1 inactive IT Staff;
- at least 1 active Administrator;
- realistic Tickets distributed across Requesters, statuses, priorities, and assigned/unassigned ownership;
- Public Comments and Internal Notes containing no sensitive information.

Seed credentials MUST be supplied through local configuration/environment, documented for development, and excluded from committed secrets.

## 11. REST API Summary

The detailed contract is in `api-spec.md`. The implementation MUST expose:
- login/logout/current-user/password-change;
- authenticated Lab 2 Requester Ticket/Attachment APIs;
- staff queue and ticket detail;
- claim/assign/reassign;
- IT Priority/status changes;
- Public Comments/Internal Notes;
- Administrator user list/search/filter/create/update/password reset-to-initial.

Every endpoint MUST define authentication, authorization, validation, response shape, and safe errors.

## 12. UI Summary

The detailed screen specification is in `ui-spec.md`. Major screens:
- Login;
- Mandatory Change Password;
- Requester Ticket screens;
- IT Staff Ticket Queue;
- IT Staff Ticket Detail;
- Administrator User Management.

All use existing Zen Green tokens/components and responsive/accessibility conventions from Lab 2.

## 13. Acceptance Criteria

- **AC-01** Active user with valid credentials receives authenticated access with safe user identity and role.
- **AC-02** Initial-password user cannot access normal application screens until a valid new password is saved.
- **AC-03** Invalid or inactive credentials cannot obtain authenticated access and responses do not enumerate accounts.
- **AC-04** Logout invalidates the session and protected resources reject the old session.
- **AC-05** Current-user returns only safe identity fields; passwordHash/initial password/session token are never returned.
- **AC-06** Requester APIs ignore client-supplied alternate requester identity and expose only authenticated ownership.
- **AC-07** Requester cannot access another user's Ticket, Attachment, or Internal Note.
- **AC-08** IT Staff can retrieve queue data with search/filter/sort/pagination and open Ticket Detail.
- **AC-09** IT Staff can claim/reassign only to active IT Staff users.
- **AC-10** IT Priority is independently mutable by IT Staff while Requested Priority remains unchanged.
- **AC-11** Only transitions in the approved status matrix succeed.
- **AC-12** Requester “Problem Appears Resolved” does not formally resolve/close the Ticket.
- **AC-13** Public Comments are readable by authorized Requester/IT Staff viewers and are append-only.
- **AC-14** Internal Notes are readable only by IT Staff and are append-only.
- **AC-15** Non-Administrators cannot invoke User Management APIs.
- **AC-16** Administrator can list/search/filter users and create/edit accounts within scope.
- **AC-17** Duplicate email and invalid role values are rejected.
- **AC-18** Administrator cannot deactivate self or the last active Administrator.
- **AC-19** New initial password forces password change at next login and invalidates prior sessions.
- **AC-20** Existing Lab 2 Tickets/Attachments survive migration with correct ownership.
- **AC-21** Seed is repeat-safe and contains all required role/account/ticket fixtures.
- **AC-22** All required screens show meaningful processing, validation, success, empty/no-results, forbidden, not-found/conflict, and safe-failure feedback where applicable.
- **AC-23** Major screens remain usable on desktop/tablet/mobile without clipping or horizontal overflow.
- **AC-24** Automated tests include unit, API/integration, UI component, responsive/style, security/authorization, migration/regression, and E2E coverage.
- **AC-25** No hardcoded/mock shortcut can satisfy a protected flow without executing real validation, persistence, authorization, and state transition logic.

Every AC MUST map to at least one test in `tests.md`.

## 14. Product Definition of Done

- All four engineering docs are reviewed and mutually consistent before implementation.
- Required database migration is applied without data loss.
- Authentication, password-change, logout, current-user and authorization flows are implemented end-to-end.
- No password/session secret is exposed to client code, logs, test snapshots, or API responses.
- Requester regression tests pass.
- IT Staff and Administrator test suites pass.
- UI component/style/responsive/accessibility checks pass.
- E2E flows pass against the real application and real test database.
- No dummy/hardcoded API returns exist for required flows.
- Protected endpoints remain secure when called directly without the UI.
- GitHub Issues/PRs and review evidence satisfy the Lab 3 workflow requirements.
- Final main branch contains the approved specification and passing test evidence.

## 15. Assumptions / Explicit Design Decisions

1. **Authentication mechanism:** server-side session with opaque random cookie token. Cookie is `HttpOnly`, `Secure` in non-local environments, `SameSite=Lax`, `Path=/`. Raw token is stored only by the browser; server stores only a hash.
2. **CSRF:** state-changing requests require same-origin `Origin` validation plus a CSRF token mechanism appropriate to the existing application architecture. The chosen implementation must be documented in code and tested.
3. **Session timeout:** 8-hour inactivity, 24-hour absolute; logout/revocation immediately invalidates.
4. **Administrator ticket operations:** not granted. Administrator responsibilities are intentionally separated from IT Staff ticket operations.
5. **Internal Notes:** IT Staff only. This is the authorization-matrix decision for this specification.
6. **Comment/note limit:** 4000 characters, after trimming.
7. **Password policy:** 12–128 characters, new password must differ from current password.
8. **Queue default:** sort by `updatedAt DESC`, then Ticket number descending. Default page size 20; allowed page sizes 10/20/50.
9. **Queue search:** Ticket number, Summary. Filters: status, Requested Priority, IT Priority, ownership state (assigned/unassigned), and owner. Sorting: Created Date, Updated Date, Requested Priority, IT Priority, Status, Ticket Number.
10. **User list:** no pagination, one optional role filter, search by name/email.
11. These decisions resolve implementation choices left open by the handout; they do not expand scope beyond Lab 3.
