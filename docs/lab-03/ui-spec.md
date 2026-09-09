# Lab 3 UI Specification

## 1. UI Principles

- Reuse the Lab 2 Zen Green design tokens, components, spacing, form conventions, cards, badges, button styles, validation placement, responsive rules, and accessibility expectations.
- Do not introduce a second visual system.
- Do not expose unauthorized navigation destinations.
- Hidden/disabled controls are presentation only; backend authorization remains mandatory.
- Passwords, session tokens, Internal Notes, and other sensitive values must never be displayed in logs, error banners, URL parameters, screenshots, or telemetry.
- All screens must support desktop, tablet, and mobile without clipping, overlap, or unintended horizontal overflow.

## 2. Global Application Shell

### Authenticated header

Show:
- current user's display name;
- current role badge;
- Logout action;
- permitted password/profile action only where implemented.

The Development Requester display is removed.

### Role navigation

Requester:
- Tickets
- permitted Ticket creation/action routes

IT Staff:
- Ticket Queue

Administrator:
- User Management

Do not render unauthorized destinations. Direct URL access must still be blocked by backend authorization.

### Global feedback

Use existing Lab 2 feedback conventions for:
- loading/busy;
- saving;
- success;
- field validation;
- empty;
- no-results;
- forbidden;
- not-found;
- conflict;
- safe API failure.

Do not show raw server stack traces or internal error objects.

## 3. Screen: Login

### Mode

Create/authentication mode.

### Controls

- Email input.
- Password input.
- Sign In button.

### Validation

- Email is required and must match the application's established email format.
- Password is required.
- Trim email outer whitespace before sending.
- Do not trim password internally beyond the documented password policy.

### States

- Idle: form available.
- Busy: submit disabled and visible progress.
- Invalid input: inline field feedback.
- Invalid/inactive credentials: generic safe failure message.
- Successful standard login: navigate to role landing page.
- Successful first-login authentication: navigate only to Change Password.
- Unexpected API failure: safe generic failure message.

Do not provide separate messages such as “email does not exist” versus “password incorrect”.

## 4. Screen: Mandatory Change Password

### Mode

Forced first-login action.

### Controls

- Current/initial password field only if the backend requires it for the flow.
- New password.
- Confirm new password.
- Save Password.

### Rules

- New password 12–128 characters.
- New password must differ from current password.
- Confirmation must exactly match.
- Password values are never shown in application logs or URLs.
- User cannot dismiss/skip the screen.
- Normal application navigation remains unavailable while forced change is outstanding.

### Success

- Show success feedback.
- Replace restricted session state with normal authenticated state.
- Navigate to the appropriate role landing screen.

### Failure

- Validation feedback remains near the relevant control.
- Backend failure uses safe error text.
- Do not reveal password hashing/credential details.

## 5. Requester Screens — Regression

Preserve Lab 2 screens except for the explicitly superseded identity controls.

### Required changes

- Remove Development Requester selector.
- Remove Change Requester action.
- Remove client-side requester identity switching.
- Display authenticated requester name in the shell.
- Ticket create operations use authenticated identity.
- Existing Ticket/Attachment ownership behavior remains intact.

### Ticket Detail additions

Add:
- Public Comments section;
- comment compose control;
- “Problem Appears Resolved” action.

Do not add direct Resolved/Closed controls for Requesters.

### Comment UI

- Clearly label as `Public Comment`.
- Show author and backend creation timestamp.
- Existing comments are read-only.
- Empty/whitespace content shows validation.
- Maximum 4000 characters.
- Safe text rendering; user content is not treated as HTML.

### Problem Appears Resolved

- Clear action label.
- Confirmation is optional; if used, it must not imply formal resolution.
- Success indicates that the Requester has notified IT Staff.
- Ticket status does not change.

## 6. Screen: IT Staff Ticket Queue

### Mode

Read/list/operational navigation.

### Desktop representation

Use a responsive table with only decision-useful columns:
- Ticket Number
- Created Date
- Summary
- Category
- Requested Priority
- IT Priority
- Current Status
- Ticket Owner
- Last Updated
- Open Detail action

Do not create a mega-grid.

### Search

Search:
- Ticket Number
- Summary

Search behavior must be server-driven.

### Filters

Provide:
- Status (MUST include all 8 system statuses including `OPEN` and `CLOSED`)
- Requested Priority
- IT Priority
- Ownership state (Assigned/Unassigned)
- Owner

Only one user-facing filter value per filter dimension is required.

### Sort

Supported:
- Created Date
- Updated Date
- Requested Priority
- IT Priority
- Status
- Ticket Number

Show current sort direction.

### Pagination

- Default page size: 20.
- Supported page sizes: 10, 20, 50.
- Show current page, total pages/records if available, and next/previous controls.
- Disable controls when no adjacent page exists.
- MUST gracefully handle empty datasets (e.g., 0 tickets) using defensive programming (e.g., handling missing or zero `totalPages` without crashing).
- Invalid query values must surface safe validation and fall back only according to the API contract; do not silently invent behavior.

### States

- Loading: skeleton/spinner consistent with Lab 2.
- Empty dataset: clear no-work message.
- No results after query/filter: clear no-results message and preserve search/filter context.
- Forbidden: role-safe forbidden state.
- API failure: safe retryable failure.
- Success: display queue data.

### Mobile representation

Do not force the desktop table into a narrow viewport. Use stacked Ticket cards showing the same essential information and an Open Detail action.

### Badges

Use existing badge component/token rules for:
- status;
- Requested Priority;
- IT Priority;
- ownership/assigned state.

## 7. Screen: IT Staff Ticket Detail

### Mode

Read + operational edit.

### Information groups

Group existing Lab 2 Ticket information clearly and preserve Attachment continuity.

Operational controls:
- Ticket Owner;
- IT Priority;
- Status transition;
- Public Comments;
- Internal Notes.

Read-only information should remain visually distinct from editable controls.

### Ownership

Controls:
- Claim button when unassigned.
- Assign/Reassign selector for active IT Staff only.
- Saving shows busy state.
- Success refreshes current Ticket state.
- Conflict/state-change failure does not silently overwrite another update.

### IT Priority

- Show current IT Priority.
- Allow permitted IT Staff change.
- Requested Priority is visibly separate and read-only.
- Saving must be explicit and show success/failure.

### Status

- Show current status badge.
- Provide only allowed next states.
- Never display invalid transitions as actionable choices.
- Required confirmations for Resolved, Closed, Cancelled.
- Reopened must be clearly distinguishable from a normal In Progress state.
- Requester “Problem Appears Resolved” is informational and not a status control.

### Public Comments

- Visually distinct section labelled `Public Comments`.
- Show existing entries with author and creation time.
- Composer available to authorized IT Staff.
- Append-only.
- Never include Internal Note content in this section.

### Internal Notes

- Strongly visually distinct from Public Comments.
- Label `Internal Notes — IT Staff Only`.
- Existing entries read-only.
- Composer available to IT Staff.
- Append-only.
- Never visually reuse the Public Comment composer in a way that could cause accidental cross-posting.
- Internal Notes must never appear in Requester views.

### Attachments

Preserve Lab 2 attachment behavior exactly unless directly contradicted by this specification.

## 8. Screen: Administrator User Management

### Mode

List + create + edit.

### Layout

Single minimalist User Management screen.

### User list

Columns:
- Name
- Email
- Role
- Status
- Edit action

No mandatory pagination.
No multi-column sorting.
No multiple simultaneous filters.

### Search

Single search input for name/email.

### Optional role filter

One role filter may be displayed.

### Create User

Fields:
- Name
- Email
- Role
- Active/Inactive
- Initial Password
- Confirm Initial Password

Rules:
- exactly one valid role;
- duplicate email shows field/form validation;
- invalid values never reach successful submission;
- initial password is treated as a credential and never re-displayed after save.

### Edit User

Editable:
- Name
- Email
- Role
- Activation state

The edit screen may include `Set New Initial Password`, which is a separate credential action.

### Safety actions

- Disable own deactivation.
- Prevent deactivation that would remove the last active Administrator.
- Explain the safety restriction in a non-sensitive validation message.

### New initial password

After save:
- user has `mustChangePassword=true`;
- previous sessions are invalidated;
- Administrator sees only a success confirmation, never the stored hash;
- next login forces Change Password.

### States

- Loading list.
- Empty user list (unexpected but must have a meaningful state).
- No search results.
- Form validation.
- Duplicate-email conflict.
- Forbidden.
- API failure.
- Save success.

## 9. Accessibility / Responsive Checklist

Every major screen must be verified at desktop, tablet, and mobile widths.

Checklist:
- keyboard can reach all controls;
- visible focus indicator;
- form labels are programmatically associated;
- validation is not conveyed by color alone;
- status/priority badges remain understandable without color alone;
- controls have accessible names;
- no clipped text for required information;
- no overlapping controls;
- no unintended horizontal page overflow;
- tables/queue cards remain readable;
- modal/confirmation focus behavior follows the existing Lab 2 accessible pattern;
- error feedback is announced or positioned consistently with existing application conventions.

## 10. Visual Evidence Requirements

Screenshots for:
- authentication;
- staff queue;
- staff ticket detail;
- user management.

Evidence must cover desktop/tablet/mobile as requested by the lab. Screenshots must be readable without extreme zoom.

The final visual checklist must record:
- Zen Green consistency;
- role navigation;
- badges;
- editable/read-only distinction;
- validation placement;
- focus;
- clipping;
- overlap;
- horizontal overflow.

## 11. Explicit UI Non-Goals

Do not add:
- dashboards/KPIs;
- advanced user administration;
- multi-role UI;
- bulk user actions;
- user deletion;
- email/password reset delivery;
- social login/SSO/MFA;
- advanced queue analytics;
- Actions Taken UI;
- SLA/escalation UI.
