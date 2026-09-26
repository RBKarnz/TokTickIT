# Lab 4 Engineering Specification

## 1. Sprint Goal

Deliver the complete operational service-desk increment by adding Actions Taken under each Ticket, enforcing the final Ticket status transition matrix and backend resolution gate, providing role-appropriate operational dashboards with accessible drill-down for Requesters, IT Staff, and Administrators, and hardening the entire application across security, concurrency, duplicate-submission prevention, accessibility, and visual consistency while preserving all Lab 1 to 3 behaviors under the Zen Green design system.

## 2. Stakeholder Request — Interpreted

The service desk currently supports Ticket submission, triage, assignment, priorities, public communication, and internal notes, but it lacks a structured way to plan, assign, track, and audit actual work performed. Actions Taken must be added under each Ticket to record what work was done, who did it, who is assigned, and whether follow-up is needed. While the primary Ticket Owner coordinates the Ticket as a whole, different IT Staff members and Administrators may perform and record individual actions. Requesters must be able to view these actions on their own Tickets to stay informed, but cannot create or modify them. Requesters may still indicate that a problem appears resolved, but this flag is strictly advisory; the backend must enforce that only authorized staff formally resolve a Ticket after required resolution criteria are satisfied. Finally, concise role-appropriate dashboards must replace static entry points to provide immediate visibility into active queues, urgent items, and resolved work.

## 3. Scope

### 3.1 Included

- Actions Taken data model, relationships, validation, and REST APIs (`GET`, `POST`, `PATCH`).
- Action assignment to active IT Staff or Administrators, independent of the overall Ticket Owner.
- Action lifecycle status matrix (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- Final Ticket status transition matrix enforced by the backend for IT Staff and Administrators.
- Backend-enforced Ticket resolution gate requiring a resolution summary, at least one completed action, and no pending follow-up actions.
- Append-only `TicketStatusHistory` audit table recording every status transition with actor, timestamp, and optional reason.
- Optimistic concurrency control via integer `version` columns on Tickets and Actions Taken.
- Safe duplicate-submission handling using disabled submit controls and an `Idempotency-Key` header on action creation.
- Requester operational dashboard summarizing open, waiting, and resolved tickets with drill-down links.
- IT Staff operational dashboard summarizing unassigned tickets, owned tickets, open actions, pending follow-ups, breakdown by status and priority, and urgent lists.
- Administrator operational dashboard extending the IT Staff dashboard with active/inactive user-account metrics.
- Drill-down list filtering support (`statusGroup=open`, `ownerId=me`, `actionAssignee=me`, `followUp=pending`).
- Expanded Administrator role permissions granting full IT Staff ticket operational capabilities, superseding Lab 3 BR-23 and BR-41.
- Implementation of Lab 3 technical debt: CSRF protection (Origin validation + session-bound HMAC token), atomic status transitions and last-admin guard, disposable-database migration regression testing, viewport-aware E2E selectors, and automated style checks.
- Removal of obsolete Lab 2 Development Requester selector and context.
- Responsive Zen Green UI extensions, keyboard accessibility, visible focus states, and safe failure feedback.
- Full regression verification across all Lab 1 to 3 capabilities.
- Complete documentation: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md`.

### 3.2 Explicitly Excluded

- Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- Email, SMS, LINE, push, or external notification services.
- Inventory consumption, spare-parts management, purchasing, or cost accounting.
- Time-sheet billing, payroll, or detailed labor-cost calculation.
- Multi-level approval workflows and electronic signatures.
- Advanced business-intelligence tools, custom report builders, or export warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in the Sprint 4 engineering contract.
- Dashboard trend deltas (+N from yesterday) and external charting libraries.
- Ticket creation capabilities for IT Staff or Administrators.
- Hard deletion of Actions Taken records or editing of historical status entries.

### 3.3 Preservation of Earlier Increments

1. All database changes are strictly additive; existing Users, Categories, Related Systems, Tickets, Attachments, Public Comments, and Internal Notes remain intact and valid.
2. All approved REST APIs from Labs 2 and 3 retain their functional contracts, error semantics, and status codes, except where explicitly expanded by this specification.
3. Administrator users gain operational IT Staff ticket capabilities, explicitly superseding Lab 3 BR-23 and BR-41 (per Lab 4 handout Section 4.3).
4. Ticket status update endpoint accepts an optional `expectedVersion` parameter to support optimistic locking while preserving backward compatibility for callers omitting the parameter.
5. Ticket transition to `RESOLVED` enforces the new resolution gate on the backend; legacy tickets without actions must have an action completed before formal resolution.
6. Ticket Owner assignment remains restricted to active IT Staff members only; Administrators cannot be assigned as Ticket Owners.
7. Every modified existing behavior is backed by updated regression tests citing the specific superseding rule.

## 4. Functional Requirements

### Actions Taken

- **FR-01** IT Staff and Administrators MUST be able to create an Action Taken on any Ticket they can open in the staff workflow.
- **FR-02** The system MUST record Performed by automatically from the authenticated user; the client cannot set it.
- **FR-03** An Action Taken MUST store Action DateTime, Description, Result, Assigned To, Status, Follow-Up Required, Follow-up Note and Attachment Notes.
- **FR-04** IT Staff and Administrators MUST be able to edit an Action Taken while it is PLANNED or IN_PROGRESS.
- **FR-05** IT Staff and Administrators MUST be able to assign or reassign an Action Taken to an active IT Staff member or Administrator.
- **FR-06** IT Staff and Administrators MUST be able to move an Action Taken through the action status matrix, including Complete and Cancel.
- **FR-07** The Actions Taken of a Ticket MUST be listed in stable order (`actionAt` ASC, then `id` ASC).
- **FR-08** Requesters MUST be able to view, but never create or change, all Actions Taken of their own Tickets.
- **FR-09** Repeated submission of the same create request MUST NOT create duplicate Actions Taken.

### Ticket Workflow

- **FR-10** Status controls MUST offer only transitions permitted by the final matrix for the current status.
- **FR-11** The backend MUST enforce the resolution gate on every transition to Resolved, including direct API calls.
- **FR-12** Every Ticket status change MUST append one status-history entry with previous status, new status, actor and time.
- **FR-13** The Ticket Detail screen MUST show the status history in stable chronological order to every role allowed to view the Ticket.
- **FR-14** A status change or Action update based on a stale version MUST be rejected without overwriting newer data.
- **FR-15** After a successful status change the Ticket summary status, history and version MUST refresh without a manual reload.
- **FR-16** Administrators MUST be able to perform every IT Staff ticket operation.

### Dashboards

- **FR-17** Requesters MUST have a dashboard with the metrics and lists defined in BR (Requester dashboard) for their own Tickets only.
- **FR-18** IT Staff MUST have a dashboard with the metrics and lists defined in BR (IT Staff dashboard).
- **FR-19** Administrators MUST see the IT Staff dashboard plus user-account counts.
- **FR-20** Every metric card MUST have an accessible drill-down to the matching filtered list.
- **FR-21** Dashboard values MUST be calculated by the backend from authoritative data.
- **FR-22** The Dashboard MUST be the landing page after login and appear in role navigation with an active-page indicator.
- **FR-23** Every dashboard MUST show loading, empty, forbidden and safe-failure states.

### Hardening and Regression

- **FR-24** All Lab 1–3 screens and APIs MUST keep working for permitted users.
- **FR-25** Every state-changing request MUST be protected against cross-site request forgery (Origin validation and CSRF token).
- **FR-26** Every form MUST prevent duplicate submission and keep entered data after a recoverable failure.
- **FR-27** Temporary, duplicate or obsolete UI from earlier labs MUST be removed.
- **FR-28** Screens MUST show consistent loading, validation, success, empty, forbidden, conflict, not-found and safe-failure feedback.
- **FR-29** README MUST document setup, migration, seed, tests and demonstration accounts.
- **FR-30** The migration MUST be additive, preserve all earlier data, and have a documented and tested rollback/recovery procedure.

## 5. Business Rules

### Actions Taken

- **BR-01** An Action Taken belongs to exactly one Ticket; its Ticket cannot change.
- **BR-02** The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by, and assigned to, a different IT Staff member or an Administrator.
- **BR-03** Performed by is set by the backend to the authenticated user at creation and never changes.
- **BR-04** Assigned To must be an active IT Staff member or Administrator; an inactive or other-role user is rejected (422).
- **BR-05** Action DateTime is required and cannot be more than 5 minutes in the future (Asia/Bangkok server clock).
- **BR-06** Description is required (1–2000 characters after trim); Result is optional (≤ 2000) but required when the status becomes COMPLETED.
- **BR-07** When Follow-Up Required is true, Follow-up Note is required (1–1000 characters); when false, Follow-up Note must be empty.
- **BR-08** Attachment Notes are optional text (≤ 1000 characters) describing which files or images to look at; they do not upload files.
- **BR-09** Action status matrix: `PLANNED` -> `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; `IN_PROGRESS` -> `COMPLETED`, `CANCELLED`; `COMPLETED` and `CANCELLED` are terminal.
- **BR-10** A COMPLETED or CANCELLED Action Taken is read-only; any change returns 409.
- **BR-11** Actions Taken are never deleted; Cancel is used instead.
- **BR-12** Requesters can read all fields of Actions Taken on their own Tickets and cannot write them; other Requesters' Actions are not disclosed (404).
- **BR-13** A create request repeated with the same Idempotency-Key for the same Ticket returns the original Action Taken and creates nothing new.

### Roles

- **BR-14** Administrators may perform every IT Staff operation. This supersedes Lab 3 BR-23 and BR-41.
- **BR-15** The Ticket Owner must be an active IT Staff member (unchanged from Lab 3).

### Ticket Status and Resolution

- **BR-16** Ticket statuses remain New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled.
- **BR-17** Only IT Staff and Administrators may change Ticket status, and only along the final matrix. No other transition is permitted.
- **BR-18** Resolved requires a non-empty Resolution Summary.
- **BR-19** Resolved requires at least one COMPLETED Action Taken on the Ticket.
- **BR-20** Resolved is rejected while any Action Taken on the Ticket has Follow-Up Required and is PLANNED or IN_PROGRESS.
- **BR-21** The resolution gate (BR-18 to BR-20) is enforced by the backend on every request, whatever the client.
- **BR-22** The Requester Problem Appears Resolved indication is advisory; it never changes status and never satisfies the gate.
- **BR-23** Every status change appends exactly one status-history entry in the same transaction; history entries are never updated or deleted.
- **BR-24** Status history is read in `createdAt` ASC, `id` ASC order.
- **BR-25** Tickets and Actions Taken carry a version number; a write with an out-of-date expected version is rejected with 409 and changes nothing.

#### Final Ticket Status Matrix

| Current Status | Allowed Next Statuses | Requires Confirmation Modal | Authorized Roles |
|---|---|---|---|
| NEW | OPEN, CANCELLED | CANCELLED | IT_STAFF, ADMINISTRATOR |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED | CANCELLED | IT_STAFF, ADMINISTRATOR |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED, CANCELLED | IT_STAFF, ADMINISTRATOR |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | RESOLVED, CANCELLED | IT_STAFF, ADMINISTRATOR |
| RESOLVED | CLOSED, REOPENED | CLOSED | IT_STAFF, ADMINISTRATOR |
| CLOSED | REOPENED | REOPENED | IT_STAFF, ADMINISTRATOR |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | RESOLVED, CANCELLED | IT_STAFF, ADMINISTRATOR |
| CANCELLED | none (terminal) | — | none |

#### Action Status Matrix

| Current Action Status | Allowed Next Statuses | Terminal? | Allowed Fields Editable |
|---|---|---|---|
| PLANNED | IN_PROGRESS, COMPLETED, CANCELLED | No | description, result, assignedToId, actionAt, followUpRequired, followUpNote, attachmentNotes |
| IN_PROGRESS | COMPLETED, CANCELLED | No | description, result, assignedToId, actionAt, followUpRequired, followUpNote, attachmentNotes |
| COMPLETED | none | Yes | none (read-only) |
| CANCELLED | none | Yes | none (read-only) |

### Dashboards

- **BR-26** All dashboard date boundaries use Asia/Bangkok; last 7 days is the rolling 168 hours before the request.
- **BR-27** Open group = New, Open, In Progress, Waiting for Requester, Reopened.
- **BR-28** Requester dashboard metrics count only Tickets whose requester is the authenticated user.
- **BR-29** IT Staff dashboard metrics follow the IT Staff table; me is the authenticated user.
- **BR-30** The Administrator dashboard is the IT Staff dashboard plus active/inactive user counts per role.
- **BR-31** Empty results are returned as 0 and empty lists, never null; lists contain at most 5 Tickets.
- **BR-32** Every metric has a drill-down to a list that shows exactly the counted records.

#### Requester Dashboard Metrics

| Key | Label | Calculation | Drill-down |
|---|---|---|---|
| `openTickets` | My Open Tickets | status in Open group | `/tickets?statusGroup=open` |
| `waitingForMe` | Waiting for Me | status = Waiting for Requester | `/tickets?status=WAITING_FOR_REQUESTER` |
| `resolved` | Resolved | status = Resolved | `/tickets?status=RESOLVED` |
| `closed` | Closed | status = Closed | `/tickets?status=CLOSED` |
| `recentlyUpdated` (list) | Recently Updated | 5 newest by `updatedAt` desc | `/tickets/:id` |
| `recentlyResolved` (list) | Recently Resolved | Tickets whose latest history row `toStatus = RESOLVED` is within the last 7 days, newest first, max 5 | `/tickets/:id` |

#### IT Staff Dashboard Metrics

| Key | Label | Calculation | Drill-down |
|---|---|---|---|
| `unassigned` | Unassigned | `ownerId IS NULL` and Open group | `/staff/queue?ownership=unassigned&statusGroup=open` |
| `myOwnedOpen` | My Tickets | `ownerId = me` and Open group | `/staff/queue?ownerId=me&statusGroup=open` |
| `myOpenActions` | My Open Actions | Actions with `assignedToId = me` and status PLANNED/IN_PROGRESS (count of actions) | `/staff/queue?actionAssignee=me` |
| `pendingFollowUps` | Pending Follow-ups | Actions with `followUpRequired = true` and status PLANNED/IN_PROGRESS (count) | `/staff/queue?followUp=pending` |
| `byStatus` | Tickets by Status | count per each of the 8 statuses (all 8 keys always present) | `/staff/queue?status=STATUS` |
| `byItPriority` | Open by IT Priority | Open group, count per LOW/MEDIUM/HIGH/CRITICAL (all keys present) | `/staff/queue?itPriority=P&statusGroup=open` |
| `urgent` (list) | Urgent | Open group, IT Priority CRITICAL or HIGH, order CRITICAL first then oldest `updatedAt`, max 5 | `/tickets/:id` |
| `recentlyUpdated` (list) | Recently Updated | 5 newest by `updatedAt` desc, all statuses | `/tickets/:id` |

#### Administrator Dashboard Metrics

Includes all IT Staff dashboard metrics plus:

| Key | Label | Calculation | Drill-down |
|---|---|---|---|
| `users.REQUESTER.active` | Active Requesters | Users with role REQUESTER and `isActive = true` | `/admin/users?role=REQUESTER` |
| `users.REQUESTER.inactive` | Inactive Requesters | Users with role REQUESTER and `isActive = false` | `/admin/users?role=REQUESTER` |
| `users.IT_STAFF.active` | Active IT Staff | Users with role IT_STAFF and `isActive = true` | `/admin/users?role=IT_STAFF` |
| `users.IT_STAFF.inactive` | Inactive IT Staff | Users with role IT_STAFF and `isActive = false` | `/admin/users?role=IT_STAFF` |
| `users.ADMINISTRATOR.active` | Active Administrators | Users with role ADMINISTRATOR and `isActive = true` | `/admin/users?role=ADMINISTRATOR` |
| `users.ADMINISTRATOR.inactive` | Inactive Administrators | Users with role ADMINISTRATOR and `isActive = false` | `/admin/users?role=ADMINISTRATOR` |

### Migration and Regression

- **BR-33** The Lab 4 migration is additive; all Users, Tickets, Attachments, Public Comments and Internal Notes remain valid.
- **BR-34** Legacy Tickets start with zero Actions Taken and one backfilled status-history entry (fromStatus null, toStatus = current status, time = Ticket updatedAt).
- **BR-35** Legacy Tickets that are not yet Resolved must pass the resolution gate like any other Ticket; Tickets already Resolved or Closed keep their status.
- **BR-36** Seed execution is idempotent and provides Tickets with zero, one and many Actions Taken and data that produces both zero and non-zero dashboard metrics.
- **BR-37** Every state-changing request must pass Origin validation and carry a valid CSRF token when a session exists.

## 6. UI Specification Summary

| Screen | Structure & Modes | Controls & Role Behaviour | Feedback & Responsive |
|---|---|---|---|
| Requester Dashboard | Greeting, 4 metric cards, 2 lists (Recently Updated, Recently Resolved), Quick Actions | Clickable cards with accessible drill-down to filtered My Tickets; view links to Ticket Detail | Loading skeletons, zero counts, empty list messaging; cards stack on tablet (2x2) and mobile (1 column) |
| IT Staff Dashboard | Greeting, 4 primary cards, breakdown cards (By Status, By Priority), Urgent list, Recent list, Quick Actions | Operational triage entry; cards drill down to Staff Queue with filter parameters prefilled | High-contrast badges; safe error banner with retry; responsive grid adapting from 4 columns to single column |
| Administrator Dashboard | Identical to IT Staff Dashboard plus User Account Breakdown panel | Full IT Staff operational capabilities plus quick drill-down to User Management by role | Consistent card styling; clear active/inactive metrics; fully responsive across viewports |
| Ticket Detail — Actions Taken | Tab panel with count badge; list mode, create form mode, edit mode | IT Staff/Admin can create, edit, assign, complete, cancel; Requester has read-only view | Inline validation, conditional follow-up note visibility, 409 conflict retention, mobile stacked cards |
| Ticket Detail — Status & History | Status transition panel + Timeline audit log | Status select restricted to matrix; confirmation modals; resolution gate blocker details | Live refresh of summary badge, timeline, and version upon update; 409 stale notice keeps form data |
| Staff Queue / My Tickets | Filter toolbar, table of tickets, pagination controls | Accepts dashboard drill-down query parameters (`statusGroup`, `ownerId`, `actionAssignee`, `followUp`) | "Filtered from Dashboard" active filter chip with Clear button; responsive table/card layouts |
| Global Shell | Top navigation bar with branding, role links, and user menu | Active route indication via `aria-current="page"` and visible border; default post-login route is `/dashboard` | Mobile hamburger drawer; complete removal of obsolete Development Requester selector |

Full details: `ui-spec.md`.

## 7. Data Changes

### ActionTaken

Represents discrete work tasks, triage actions, or interventions performed on a Ticket.

```prisma
model ActionTaken {
  id               Int          @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket       @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  performedById    Int
  performedBy      User         @relation("ActionPerformer", fields: [performedById], references: [id], onDelete: Restrict)
  assignedToId     Int
  assignedTo       User         @relation("ActionAssignee", fields: [assignedToId], references: [id], onDelete: Restrict)
  actionAt         DateTime     @default(now())
  description      String       @db.Text
  result           String?      @db.Text
  status           ActionStatus @default(PLANNED)
  followUpRequired Boolean      @default(false)
  followUpNote     String?      @db.Text
  attachmentNotes  String?      @db.Text
  version          Int          @default(1)
  idempotencyKey   String?      @db.VarChar(100)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([ticketId, actionAt])
  @@index([assignedToId, status])
  @@unique([ticketId, idempotencyKey])
}

enum ActionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

### TicketStatusHistory

Immutable audit log recording every formal lifecycle status change for a Ticket.

```prisma
model TicketStatusHistory {
  id          Int          @id @default(autoincrement())
  ticketId    Int
  ticket      Ticket       @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  fromStatus  TicketStatus?
  toStatus    TicketStatus
  changedById Int?
  changedBy   User?        @relation(fields: [changedById], references: [id], onDelete: Restrict)
  reason      String?      @db.Text
  createdAt   DateTime     @default(now())

  @@index([ticketId, createdAt, id])
}
```

### Ticket (additive)

Add integer `version` field for optimistic concurrency control.

```prisma
model Ticket {
  // ... all existing fields preserved ...
  version             Int                   @default(1)
  actionsTaken        ActionTaken[]
  statusHistory       TicketStatusHistory[]
}
```

### Indexes

- `ActionTaken`: `(ticketId, actionAt)` for chronological listing; `(assignedToId, status)` for dashboard action queries; unique `(ticketId, idempotencyKey)` for duplicate submission prevention.
- `TicketStatusHistory`: `(ticketId, createdAt, id)` for stable chronological timeline presentation.
- `Ticket`: `(ownerId, currentStatus)` and `(currentStatus, itPriority)` to optimize staff and requester dashboard aggregation queries.

### Migration

The migration adds the `ActionStatus` enum, creates `ActionTaken` and `TicketStatusHistory` tables, and adds the `version` column to `Ticket` with a default of 1. All existing records and relations remain unchanged.

### Backfill

Upon migration deployment, a backfill SQL step creates one initial `TicketStatusHistory` record for every existing Ticket:
- `ticketId` = `Ticket.id`
- `fromStatus` = `NULL`
- `toStatus` = `Ticket.currentStatus`
- `changedById` = `Ticket.ownerId` (or NULL if unassigned)
- `reason` = "Backfilled from migration"
- `createdAt` = `Ticket.updatedAt`

Existing tickets start with zero `ActionTaken` rows.

### Rollback / Recovery

1. Take a full logical database backup using `pg_dump` prior to executing `prisma migrate deploy`.
2. Because the migration is strictly additive, rollback can be achieved either by executing the documented down SQL script (dropping `ActionTaken`, `TicketStatusHistory`, `ActionStatus` enum, and removing `version` from `Ticket`) or by restoring the pre-migration `pg_dump` archive.
3. Rollback safety and data preservation are verified using an automated migration test suite on a disposable database.

### Seed

The seed script is idempotent and provides:
- Tickets with zero actions, one action, and multiple actions performed by different staff.
- Actions spanning all four statuses (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- Actions with pending follow-up notes and actions with completed results.
- Data distributions producing both non-zero and zero counts for all dashboard cards across Requesters, IT Staff, and Administrators.

### Database Design Decisions

- **D-DB-1: Separate `ActionTaken` table (1:N) instead of JSON column on Ticket.**
  - *Alternatives:* Storing an array of JSON objects inside a `Ticket.actions` column.
  - *Rationale:* A relational table enables relational integrity (foreign keys to `User` for performer and assignee), distinct indexing on action assignee and status for performant dashboard metrics, row-level optimistic concurrency via dedicated versioning, and prevents lock contention on the parent Ticket during action updates.
- **D-DB-2: Integer `version` column for optimistic locking instead of `updatedAt` timestamps.**
  - *Alternatives:* Relying on `updatedAt` matching or unconditional updates.
  - *Rationale:* Clock skew, database timestamp precision differences across environments, and sub-millisecond concurrent updates make timestamp-based OCC brittle. A strictly incrementing integer version provides deterministic, tamper-proof optimistic concurrency control via `WHERE id = ? AND version = ?`.
- **D-DB-3: Dedicated append-only `TicketStatusHistory` table instead of state mutation logs.**
  - *Alternatives:* Parsing status changes out of free-text Internal Notes or audit log tables.
  - *Rationale:* An explicit, structured history table enforces immutability, provides deterministic ordering (`createdAt ASC, id ASC`), simplifies timeline queries for UI rendering, and guarantees audit traceability required by service-desk governance.

## 8. API Contract Summary

| Method | Path | Roles | Purpose |
|---|---|---|---|
| `GET` | `/api/tickets/:ticketId/actions` | Requester (own), IT Staff, Admin | List actions taken for a ticket in stable chronological order |
| `POST` | `/api/tickets/:ticketId/actions` | IT Staff, Admin | Create a new action taken; supports `Idempotency-Key` |
| `PATCH` | `/api/actions/:actionId` | IT Staff, Admin | Update action taken fields, status, or assignee; requires `expectedVersion` |
| `POST` | `/api/staff/tickets/:ticketId/status` | IT Staff, Admin | Update ticket status; enforces matrix, resolution gate, OCC, and history logging |
| `GET` | `/api/tickets/:ticketId/status-history` | Requester (own), IT Staff, Admin | Retrieve immutable status transition history in stable order |
| `GET` | `/api/dashboard/requester` | Requester | Retrieve authoritative summary metrics and recent tickets for authenticated requester |
| `GET` | `/api/dashboard/staff` | IT Staff, Admin | Retrieve authoritative operational queue metrics, urgent tickets, and (for Admin) user counts |
| `GET` | `/api/staff/tickets` (extended) | IT Staff, Admin | Supports drill-down query filters (`statusGroup`, `ownerId`, `actionAssignee`, `followUp`) |
| `GET` | `/api/tickets` (extended) | Requester | Supports drill-down query filter (`statusGroup=open`) |

Full contract: `api-spec.md`.

## 9. Acceptance Criteria

- **AC-01** Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as Performed by and the approved assignee.
- **AC-02** Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned.
- **AC-03** Performed by cannot be set or changed by the client.
- **AC-04** Follow-Up Required without a Follow-up Note is rejected with a field error and nothing is saved.
- **AC-05** Assigning an Action Taken to an inactive user or a Requester is rejected (422) and nothing changes.
- **AC-06** Action status changes follow the action matrix; COMPLETED and CANCELLED Actions cannot be changed.
- **AC-07** A Ticket can hold several Actions Taken by different staff members, listed in stable order.
- **AC-08** Requesters see all Actions Taken of their own Tickets read-only; write attempts return 403; other Requesters' Tickets return 404.
- **AC-09** Submitting the same Action Taken twice (same Idempotency-Key or a double click) creates only one record.
- **AC-10** Only permitted Ticket transitions succeed for IT Staff and Administrators; all others are rejected without change; Requesters cannot change status.
- **AC-11** A transition to Resolved without a Resolution Summary, without a COMPLETED Action, or with a pending follow-up is rejected with 409 RESOLUTION_GATE, also when called directly through the API.
- **AC-12** The Requester Problem Appears Resolved indication does not change status or satisfy the gate.
- **AC-13** Every status change appends one history entry; history is returned in stable order and cannot be edited or deleted.
- **AC-14** A stale status change or Action update returns 409 STALE_UPDATE and does not overwrite the newer data.
- **AC-15** Administrators can perform every IT Staff ticket operation.
- **AC-16** The IT Staff dashboard counts match direct database queries for every metric, for the current user.
- **AC-17** The Administrator dashboard adds user counts per role and activation state.
- **AC-18** Every dashboard card drill-down opens a list showing exactly the counted records.
- **AC-19** Dashboards show loading, empty (zero), forbidden and safe-failure states.
- **AC-20** After login each role lands on its Dashboard, and navigation marks the active page.
- **AC-21** The migration preserves all Lab 2–3 data, backfills history, and can be rolled back or recovered as documented.
- **AC-22** The seed is repeat-safe and produces Tickets with zero, one and many Actions and both zero and non-zero metrics.
- **AC-23** State-changing requests without a valid CSRF token or from a foreign Origin are rejected with 403 and change nothing.
- **AC-24** Every Lab 1–3 regression test and E2E flow passes on Desktop, Tablet and Mobile.
- **AC-25** Forms prevent duplicate submission and keep entered data after a recoverable failure.
- **AC-26** Obsolete Lab 2 UI (Development Requester selector) is removed, with no console errors, stub text or broken links.
- **AC-27** All Lab 4 screens are usable on desktop, tablet and mobile without clipping, overlap or horizontal overflow, with visible focus and non-colour status cues.
- **AC-28** Dashboard endpoints respond within the performance-smoke budget (p95 < 500 ms on seed data, local).
- **AC-29** Automated tests include unit, API/integration, UI component, UI style, responsive, authorization, workflow, migration/regression, performance-smoke and E2E coverage.
- **AC-30** No hardcoded or mocked shortcut satisfies a protected flow without real validation, persistence, authorization and state transition.

Every AC maps to at least one test in `tests.md`.

## 10. Product Definition of Done

- [ ] All four Sprint 4 engineering documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) are peer-reviewed, merged into `lab4-staging`, and remain consistent before implementation begins.
- [ ] Database migration executes cleanly without data loss, backfill populates historical records, and rollback/recovery is proven on a disposable database.
- [ ] Every Functional Requirement (FR-01 to FR-30) is implemented and every Acceptance Criterion (AC-01 to AC-30) has automated passing test proof.
- [ ] Final Ticket status matrix, resolution gate, and role authorization rules are strictly enforced by the backend on direct API access.
- [ ] No secrets, passwords, or raw session tokens are exposed in logs, API responses, or repository files.
- [ ] All Lab 1 to 4 automated test suites pass cleanly on `main` (unit, API, workflow, migration, UI component, responsive style, and E2E).
- [ ] Dashboard metrics are authoritative and proven to match direct database queries.
- [ ] No dummy, mocked, or hardcoded API payloads satisfy protected business logic.
- [ ] Forms preserve entered text upon recoverable errors, and double submissions are prevented.
- [ ] UI satisfies Zen Green design principles, visible keyboard focus, semantic attributes, responsive layout without clipping or overflow, and axe accessibility standards.
- [ ] Obsolete Lab 2 UI components and references are completely eliminated.
- [ ] README setup, migration, seed, test, and demonstration instructions are up to date.
- [ ] GitHub Issues, feature branches, Pull Requests, code reviews (`reviewer.md`), and AI use reflections (`ai-use.md`) strictly follow the engineering workflow.
- [ ] Final `main` branch contains all code, documentation, and automated test output ready for PDF submission.

## 11. Assumptions and Decisions

1. **D1 (Administrator Role Expansion):** Administrators possess all operational capabilities of IT Staff (queue, claim, assign, status, notes, actions, dashboard), superseding Lab 3 BR-23 and BR-41 per lab sheet Section 4.3; primary Ticket Owner remains assignable to active IT Staff only.
2. **D2 (Actions Taken Structure):** Actions Taken include dedicated `assignedToId` (active IT Staff or Administrator) and lifecycle `status` (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
3. **D3 (Append-Only Status History):** Status transitions are recorded in an append-only `TicketStatusHistory` table with stable ordering (`createdAt ASC, id ASC`); historical records cannot be updated or deleted.
4. **D4 (Resolution Gate Definition):** Transition to `RESOLVED` requires a non-empty `resolutionSummary`, at least one `COMPLETED` Action Taken, and zero Actions Taken with `followUpRequired=true` in `PLANNED` or `IN_PROGRESS` status.
5. **D5 (Ticket Status Matrix Refinement):** Allowed transitions strictly follow the 8-status matrix with confirmations required on destructive or closing transitions; Requester problem-resolved flag remains advisory.
6. **D6 (Optimistic Concurrency Control):** `Ticket` and `ActionTaken` utilize integer `version` columns; update conflicts yield `409 STALE_UPDATE` with current server state, and UI preserves user input.
7. **D7 (Duplicate Submission Protection):** UI disables action buttons while requests are in flight; action creation supports an optional `Idempotency-Key` header to return existing records on repeated requests.
8. **D8 (Requester Action Visibility):** Requesters see all Action Taken fields (including performer, assignee, and attachment notes) for their own tickets in read-only mode; internal notes remain private.
9. **D9 (Dashboard Scope):** Dashboards exclude trend deltas (+N from yesterday) and exclude ticket creation capabilities for IT Staff, preserving role boundaries.
10. **D10 (Time Zone and Rolling Window):** All dashboard date/time boundaries use Asia/Bangkok (UTC+7); "recently resolved" represents the rolling 168 hours prior to request time.
11. **D11 (Obsolete UI Removal):** The Lab 2 Development Requester selector and context are completely removed from routes, components, and tests.
12. **D12 (Documentation Naming):** The Lab 4 AI record file is standardized as `docs/lab-04/ai-use.md` with a hyphen.
13. **Action Date Tolerance:** Action timestamps allow a maximum future tolerance of 5 minutes to accommodate minor client-server clock drift.
14. **Performance Budget:** Dashboard summary API endpoints must respond with a p95 latency under 500 ms on seeded datasets in local testing.
15. **Requester Dashboard Card 2 (wireframe vs. handout):** The Requester wireframe in lab sheet Section 8.2 labels its second card "In Progress", while Section 4.6 lists "Tickets waiting for the Requester" and the Part 8 rubric asks for "attention-required Tickets". Card 2 is therefore `waitingForMe` ("Waiting for Me", status `WAITING_FOR_REQUESTER`), because these are the Tickets that need the Requester's action. In-progress work stays visible through the "My Open Tickets" card (Open group) and the Recently Updated list, so no information from the wireframe is lost.

### Issue Map

| Order | Issue Title | Scope Summary |
|---|---|---|
| 1 | Sprint 4 Engineering Contract | `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` |
| 2 | Lab 3 Technical Debt | CSRF protection, atomic operations, disposable migration tests, mobile E2E selectors, STYLE suite |
| 3 | Data Foundation | Prisma schema migrations, backfill, repeat-safe seed, rollback/recovery tests |
| 4 | Actions Taken API & Authorization | CRUD endpoints, action status matrix, assignment validation, idempotency, role guards |
| 5 | Actions Taken UI | Ticket Detail Actions tab, list/create/edit modes, responsive card layout, input preservation |
| 6 | Ticket Workflow & Resolution Gate | Resolution gate validation, status matrix enforcement, status history timeline, summary refresh |
| 7 | Role Dashboards (API + UI) | Requester, Staff, and Admin dashboard endpoints, metric cards, drill-down filters, dashboard views |
| 8 | Final Hardening & Release | Leftover UI cleanup, double-submit protection, accessibility audits, regression verification, docs |
