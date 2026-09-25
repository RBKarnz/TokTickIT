# Lab 4 UI Specification

## 1. UI Principles (carried from Lab 2–3)

- **Zen Green Aesthetic:** The Zen Green tokens already used in the application since Lab 2: `#006B3C` primary (header, primary buttons, links), `#0B7A46` secondary and focus ring, `#EAF6EF` pale green (success and subtle highlights), `#F5F7F6` page background, `#F4F9F5` card background, and `#FFFBEB` amber background for private Internal Notes. No new colour system is introduced; typography and spacing stay as in Lab 3.
- **Predictable Affordances:** Primary operational actions use solid green buttons; destructive or terminal actions use crimson outlines/accents; secondary controls use neutral borders.
- **Non-Color Status Cues:** Every status and priority indicator pairs distinct color coding with textual badges, iconography, or explicit position.
- **State Preservation:** Form errors or optimistic concurrency conflicts never wipe uncommitted user input; entered text remains in the inputs alongside clear error callouts.
- **Accessible & Responsive:** Explicit keyboard focus rings, semantic labels (`aria-label`, `aria-describedby`), zero horizontal scrollbars on viewports from 375px to 1440px, and adaptive stacked card layouts on mobile.

## 2. Global Application Shell

### 2.1 Role-Based Navigation Bar

The top header provides immediate brand recognition, contextual navigation links per authenticated role, and a user profile dropdown.

| Role | Navigation Items | Landing Page Post-Login |
|---|---|---|
| `REQUESTER` | **Dashboard**, **My Tickets**, **Create Ticket** | `/dashboard` |
| `IT_STAFF` | **Dashboard**, **Ticket Queue** | `/dashboard` |
| `ADMINISTRATOR` | **Dashboard**, **Ticket Queue**, **User Management** | `/dashboard` |

### 2.2 Active Page Indication

- The currently active navigation link is visually distinguished by a 3px solid Zen Green bottom border, bold typography, and semantic attribute `aria-current="page"`.
- Inactive links feature standard weight text with subtle hover underlines.
- Mobile view collapses items into a clean hamburger sliding drawer with identical active state highlights.

### 2.3 Elimination of Obsolete Components

- The development-time Requester selector (`RequesterSelectionPage.tsx`, `RequesterContext.tsx`) is completely removed from the router, layout header, and codebase.

## 3. Screen: Requester Dashboard

### 3.1 Layout & Visual Structure

- **Route:** `/dashboard` (for Requester sessions)
- **Header:** Personalized greeting banner: `"Welcome back, {User.name}!"` with subtitle `"Here's the latest on your requests."` and a `"Refresh"` button with spinner during reload.
- **Metric Cards (Row 1):** Responsive grid of 4 cards:
  1. **My Open Tickets:** Total tickets in Open group (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
  2. **Waiting for Me:** Tickets with status `WAITING_FOR_REQUESTER` requiring user input.
  3. **Resolved:** Total tickets formally marked `RESOLVED`.
  4. **Closed:** Total archived/completed tickets with status `CLOSED`.
  - *Card Affordances:* Large high-contrast metric number, clear category label, and an accessible drill-down anchor: `"View all"` with `aria-label="View all {Label}"`.
- **Lists & Quick Actions (Row 2):** Two-column split layout:
  - **Column 1 (Left 65%):**
    - **Recently Updated:** Top 5 tickets owned by requester sorted by `updatedAt DESC`. Displays Ticket ID (`TKT-YYYY-XXXXXX`), summary, status badge, and relative/formatted timestamp.
    - **Recently Resolved:** Tickets resolved within the last 7 rolling days (max 5).
  - **Column 2 (Right 35%):**
    - **Quick Actions Card:** Prominent vertical action stack:
      - `+ Create Ticket` -> navigates to `/create-ticket`
      - `View My Tickets` -> navigates to `/tickets`
- **Empty States:** When counts are 0, cards display `"0"`. Empty lists display an illustrated empty state container with text: `"No tickets found in this view."`

## 4. Screen: IT Staff Dashboard

### 4.1 Layout & Visual Structure

- **Route:** `/dashboard` (for IT Staff sessions)
- **Header:** Personalized greeting banner: `"Welcome back, {User.name}!"` with subtitle `"Here's what's happening in your queue today."` and a `"Refresh"` button.
- **Operational Metric Cards (Row 1):** Responsive grid of 4 primary triage cards:
  1. **Unassigned:** Open tickets with no owner assigned (`ownerId IS NULL`).
  2. **My Tickets:** Open tickets owned by current staff member (`ownerId = me`).
  3. **My Open Actions:** Actions assigned to current staff member with status `PLANNED` or `IN_PROGRESS`.
  4. **Pending Follow-ups:** Any action across all tickets with `followUpRequired = true` still awaiting completion.
- **Breakdown Panels (Row 2):**
  - **Tickets by Status:** Horizontal pill grid showing counts for all 8 statuses (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
  - **Open by IT Priority:** Severity count cards for Open group tickets (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Urgent & Recent Tickets (Row 3):**
  - **Urgent Tickets:** Up to 5 Open tickets with `HIGH` or `CRITICAL` IT Priority, ordered by priority weight then oldest update.
  - **Recently Updated:** 5 most recently active tickets across the entire service desk.
- **Quick Actions:**
  - `Open Ticket Queue` -> navigates to `/staff/queue`
  - `My Tickets Queue` -> navigates to `/staff/queue?ownerId=me&statusGroup=open`

## 5. Screen: Administrator Dashboard

### 5.1 Overview

- **Route:** `/dashboard` (for Administrator sessions)
- Administrators receive the complete **IT Staff Dashboard** view with all operational cards, breakdowns, urgent queues, and quick actions.
- **Additional Administrator Section:** Positioned directly below the operational metrics:
  - **User Accounts Breakdown Card:**
    - Displays active and inactive user tallies across all three roles:
      - **Requesters:** `{active} Active` / `{inactive} Inactive` (Drill-down: `/admin/users?role=REQUESTER`)
      - **IT Staff:** `{active} Active` / `{inactive} Inactive` (Drill-down: `/admin/users?role=IT_STAFF`)
      - **Administrators:** `{active} Active` / `{inactive} Inactive` (Drill-down: `/admin/users?role=ADMINISTRATOR`)
  - **Admin Quick Action:** `Manage Users` -> navigates to `/admin/users`.

## 6. Ticket Detail — Actions Taken

### 6.1 Placement & Tab Structure

On `TicketDetailPage.tsx`, the tab navigation contains:
`Attachments ({n})` | `Public Comments ({n})` | `Internal Notes ({n})` (Staff/Admin) | **`Actions Taken ({n})`**

### 6.2 Actions Taken List View

- **Columns (Desktop & Tablet):**
  1. **Date/Time:** Formatted Asia/Bangkok timestamp.
  2. **Description:** Action narrative text.
  3. **Result:** Action outcome (or `"—"` if not yet completed).
  4. **Performed by:** Name of staff member who recorded the action.
  5. **Assigned to:** Name of assigned staff member/admin.
  6. **Status:** High-contrast pill badge (`PLANNED` = Slate, `IN_PROGRESS` = Blue, `COMPLETED` = Green, `CANCELLED` = Neutral Gray).
  7. **Follow-up:** `"Yes"` (with expandable follow-up note) or `"No"`.
  8. **Attachment Notes:** Referenced filename notes (or `"—"`).
  9. **Actions:** `"Edit"` button (visible only to IT Staff/Admin on non-terminal actions).
- **Requester View:** Requesters see all list items and read-only details. An informational alert states:
  > *"Actions recorded by IT Staff. Private staff correspondence is kept in Internal Notes."*
  Create form and Edit buttons are completely suppressed for Requesters.
- **Mobile View (<768px):** The table transitions to stacked individual cards with clear key-value labels and tap targets.

### 6.3 Create Action Mode (Staff & Admin)

- Triggered by `"+ Add Action Taken"` button above the list.
- **Form Controls:**
  - **Action Date/Time:** Default to current time (`datetime-local` input). Enforces ≤ 5 minutes into the future.
  - **Assigned To:** Dropdown containing all active IT Staff and Administrators. Defaults to logged-in user.
  - **Initial Status:** Dropdown (`PLANNED`, `IN_PROGRESS`, `COMPLETED`). Defaults to `PLANNED`.
  - **Description:** Textarea, required (1–2000 chars), with live character counter.
  - **Result:** Textarea, optional (≤ 2000 chars); dynamically becomes required if `status` is set to `COMPLETED`.
  - **Follow-Up Required:** Checkbox (default unchecked).
  - **Follow-up Note:** Textarea (1–1000 chars). Conditionally revealed and required only when `Follow-Up Required` is checked.
  - **Attachment Notes:** Textarea (optional, ≤ 1000 chars). Example note: `"e.g., Check router_config.png for verified port settings."`
- **Buttons:**
  - `"Save Action"`: Primary Zen Green button. Disabled while submitting, displaying an inline spinner to prevent double clicks.
  - `"Cancel"`: Secondary button returning to list mode without saving.

### 6.4 Edit Action Mode (Staff & Admin)

- Pre-fills all existing fields.
- `status` dropdown displays only permitted transitions from current status per Action Status Matrix.
- If current status is `COMPLETED` or `CANCELLED`, editing is disabled and form displays a read-only lock banner.
- Form includes hidden `expectedVersion` tracking optimistic locking.

## 7. Ticket Detail — Status Controls and History

### 7.1 Permitted Transitions & Resolution Gate Modal

- The status dropdown in the Ticket Detail header shows **only** transitions allowed from the ticket's current status.
- Selecting `Resolved` opens a formal **Resolution Confirmation Modal**:
  - Displays `Resolution Summary` textarea (required).
  - Displays a live **Resolution Gate Checklist**:
    - `[x] Resolution Summary provided`
    - `[x] At least one completed Action Taken exists`
    - `[x] No pending follow-up actions exist`
  - If any gate condition is not met, the `"Confirm Resolution"` button is disabled and the missing requirements are highlighted in warning red.
  - If the backend rejects resolution with `409 RESOLUTION_GATE`, the modal displays the specific server reasons returned in `error.details`.

### 7.2 Status History Timeline

- Displayed below ticket details as a vertical chronological timeline.
- Entries are ordered chronologically (`createdAt ASC, id ASC`).
- Each timeline node indicates:
  - Transition: `[Previous Status] -> [New Status]`
  - Actor: User name and role (or `"System Backfill"`)
  - Timestamp: Formatted local time
  - Reason: Optional transition comment or resolution summary
- Immutable: History records have no edit or delete controls.

### 7.3 Optimistic Concurrency Conflict Handling

- When a status transition or action update encounters a `409 STALE_UPDATE`:
  - A prominent yellow alert banner appears:
    > *"This ticket was modified by another staff member while you were editing. Please reload to review the latest state."*
  - The form **does not discard** the user's typed summary, notes, or selections.
  - A `"Reload Ticket"` button allows fetching fresh data when ready.

## 8. Drill-down Lists (My Tickets and Staff Queue)

When navigating to `/tickets` or `/staff/queue` via dashboard metric cards:
1. The list automatically applies the query parameters (`statusGroup`, `ownerId`, `actionAssignee`, `followUp`, `status`, `itPriority`).
2. An active filter banner appears above the table:
   `"Filtered from Dashboard: {Filter Description}"` with an accessible `[Clear Filter]` button to restore standard queue viewing.
3. Pagination controls and table headers maintain active filter parameters across page changes.

## 9. Feedback States

| State | Visual Treatment / Behavior |
|---|---|
| **Loading** | Accessible skeleton loaders matching the dimensions of metric cards and table rows; buttons show spinning indicators. |
| **Empty** | Clean illustrated card with friendly contextual text (e.g., `"No tickets waiting for your review."`) and a relevant primary action link. |
| **Success** | Auto-dismissing Zen Green toast banner (5 seconds) with checkmark icon and explicit close button. |
| **Validation Error** | Red inline error text positioned directly below the invalid input field, associated via `aria-describedby`; field border turns crimson. |
| **Forbidden (403)** | Informative error card explaining insufficient permissions with a button linking back to the user's appropriate dashboard. |
| **Not Found (404)** | Generic safe error banner: `"The requested resource could not be found or you do not have permission to view it."` |
| **Conflict (409)** | Warning banner detailing the conflict reason (`STALE_UPDATE`, `RESOLUTION_GATE`, `ACTION_CLOSED`); user input is strictly preserved. |
| **Safe API Failure** | Non-intrusive alert banner with `"Retry"` button; no raw stack traces or internal database errors exposed. |

## 10. Accessibility and Responsive Checklist

- **Keyboard Navigation:** All interactive elements (cards, drill-down links, buttons, tab headers, modal dialogs) are focusable via `Tab` with a visible green focus ring in `#0B7A46` (the existing Bootstrap focus style of the application).
- **Screen Reader Support:** Metric values include explicit `aria-label` descriptors (e.g., `aria-label="14 unassigned tickets, click to view"`).
- **Responsive Layout:**
  - **Desktop (>= 1024px):** 4 metric cards per row; two-column dashboard body; full data tables.
  - **Tablet (768px – 1023px):** 2 metric cards per row; stacked dashboard lists; compact table padding.
  - **Mobile (< 768px):** 1 metric card per row; full-width stacked cards; table rows collapse into self-contained cards; navigation moves to slide-out drawer.
- **Form Association:** Every input, select, and textarea has a matching `<label>` with explicit `htmlFor` matching the control's `id`.

## 11. Visual Evidence Requirements

The following screenshot artifacts are captured across three standard viewports (Desktop 1280px, Tablet 768px, Mobile 375px):
- `artifacts/lab-04/screenshots/staff-dashboard/`
- `artifacts/lab-04/screenshots/requester-dashboard/`
- `artifacts/lab-04/screenshots/actions-taken/`

### Visual Inspection Checklist

| Inspection Item | Desktop (1280px) | Tablet (768px) | Mobile (375px) | Notes |
|---|---|---|---|---|
| Zen Green Consistency | [ ] Pass | [ ] Pass | [ ] Pass | `#006B3C` primary, `#0B7A46` secondary/focus, `#F5F7F6` page background; same card and button styles as Lab 3 |
| Role Navigation & Active Page | [ ] Pass | [ ] Pass | [ ] Pass | Active underline and `aria-current` verified |
| Dashboard Cards & Drill-down | [ ] Pass | [ ] Pass | [ ] Pass | Counts clear, cards link to filtered views |
| Status / Priority / Action Badges | [ ] Pass | [ ] Pass | [ ] Pass | Textual cues and high-contrast color badges |
| Actions Taken List & Form | [ ] Pass | [ ] Pass | [ ] Pass | Clean tabular layout on desktop; cards on mobile |
| Editable vs Read-Only Controls | [ ] Pass | [ ] Pass | [ ] Pass | Requesters view only; closed actions read-only |
| Validation Placement | [ ] Pass | [ ] Pass | [ ] Pass | Inline errors below inputs; no popup alerts |
| Keyboard Focus Rings | [ ] Pass | [ ] Pass | [ ] Pass | Visible focus ring on all interactive elements |
| No Text Clipping | [ ] Pass | [ ] Pass | [ ] Pass | Headers, cards, and summaries wrap cleanly |
| No Overlapping Controls | [ ] Pass | [ ] Pass | [ ] Pass | Modals, tabs, and action buttons separated |
| No Horizontal Overflow | [ ] Pass | [ ] Pass | [ ] Pass | Zero horizontal scrollbars at 375px width |

## 12. Explicit UI Non-Goals

- Trend comparison delta badges (`+N from yesterday`) or percentage change indicators.
- External charting libraries (Canvas/SVG charts, pie graphs, sparklines).
- Ticket creation forms or buttons for IT Staff or Administrators.
- Hard delete buttons for Actions Taken or Ticket Status History records.
- Real-time WebSocket live updates or push notification banners.
- SLA countdown timers or breach flashers.
