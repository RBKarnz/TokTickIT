# Lab 2 UI Specification

## 1. Overview
This document defines the "Zen Green Theme" visual rules, responsive layouts, and component behaviors for the TokTickIT Requester interface in Lab 2.

## 2. Zen Green Theme Rules

### 2.1. Color Palette
- **Primary Green**: `#006B3C` (App header, primary actions, strong emphasis)
- **Secondary Green**: `#0B7A46` (Active tabs, focus accents, links, hover states)
- **Pale Green**: `#EAF6EF` (Selected states, success messages, subtle section emphasis)
- **Page Background**: `#F5F7F6` (Quiet near-white)
- **Surface / Cards**: White (`#FFFFFF`) with subtle border (`1px solid #E2E8F0`) and restrained shadow (`shadow-sm`).
- **Text**: Dark charcoal-green (`#1E293B` or `#0F172A`), avoid pure black.
- **Error**: Dark red (`#B91C1C`) for text and borders.
- **Warning**: Amber (`#D97706`) for badges or callouts.

### 2.2. Component Styling
- **Editable Field**: White background, clear neutral border, `#0B7A46` focus ring.
- **Read-only Field**: Soft gray-green (`#F1F5F9`) or warm ivory shading. Must look uneditable but readable.
- **Buttons**:
  - Primary: Background `#006B3C`, text White. Hover: `#0B7A46`.
  - Secondary/Outline: Border `#006B3C`, text `#006B3C`, background transparent.
  - Destructive: Background `#B91C1C` (or red outline) with white/red text for high-risk actions like attachment delete confirmation.
  - Disabled: Gray background/text, reduced opacity, `cursor-not-allowed`.
  - Busy State: Replaces button text or adds a spinner icon and visually disables the button while an action is in flight.
- **Labels & Validation**: Labels above inputs. Red asterisk `*` for required fields. Validation error messages appear immediately below the field in dark red text.

## 3. Screen Layouts

### 3.1. Responsive Behavior
- **Desktop (≥ 992px)**: Multi-column layouts. Content centered with maximum width (e.g., `max-w-5xl`).
- **Tablet (768 - 991px)**: Two-column where practical. Summary and Description span full available width.
- **Mobile (< 768px)**: 100% single column. Fields stack vertically. Buttons are touch-friendly (min-height 44px). Horizontal scrolling is prevented.

### 3.2. Development Requester Selection Screen
- **Elements**: Logo/Title, explanatory text, active Requester dropdown, "Continue" button.
- **States**: Loading skeleton, empty state (if no requesters), error state.
- **Behavior**: Selecting a user and continuing sets the active context for the session.

### 3.3. Create Ticket Screen
- **Header**: Read-only system-generated fields (Ticket Date, Requester Name).
- **Form Group**: Category, Related System, Requested Priority (side-by-side on desktop).
- **Details Group**: Summary (single line text), Description (multiline textarea, taller).
- **Attachments**: Drag-and-drop or file select area below description.
- **Footer**: Submit button (shows spinner/busy state when submitting).

### 3.4. My Tickets Screen
- **Header**: Title, "Create Ticket" button.
- **Controls**: Search bar, Filters (Category, Status), Sort dropdown.
- **Data View**:
  - Desktop: Table format (Ticket No., Summary, Category, Priority, Status, Last Updated).
  - Mobile: Card format (stacking essential info to avoid horizontal scroll).
- **Badges**: Status (e.g., NEW = Pale Green) and Priority (e.g., HIGH = Light Red).
- **Pagination**: Numbered page controls at bottom.
- **States**: Loading spinner, Empty state (no tickets exist), No-results state (search matched nothing).

### 3.5. Ticket Detail Screen
- **Header Navigation**: Must include a breadcrumb (e.g., "My Tickets > Ticket Details") and a "Back to My Tickets" navigation button.
- **Layout**: Similar to Create Ticket but all fields are styled as Read-only.
- **Attachments Section**: Lists active attachments with a Download icon and a Soft-Remove (trash) icon. Includes an explicit "Add Attachment" button/interaction to upload new files.
- **Remove Action**: Clicking remove prompts for a "removal reason" before processing.
- **Placeholder Sections**: Tabs or sections such as "Public Comments", "Internal Notes", and "Actions Taken" must be visually present but treated as disabled or placeholders for Lab 2.

## 4. Screenshot Artifact Paths
For test evidence and visual inspection, screenshots must be saved in the following directory paths within the repository:
- `artifacts/lab-02/screenshots/create-ticket/`
- `artifacts/lab-02/screenshots/my-tickets/`
- `artifacts/lab-02/screenshots/ticket-detail/`
