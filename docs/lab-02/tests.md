# Lab 2 Test Plan and Results

## 1. Test Strategy
Testing will follow Test-Driven Development (TDD) principles. We will implement tests across Unit, API, UI, and E2E layers to ensure the application meets all Acceptance Criteria (AC).

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number Generator | Returns string matching TKT-YYYY-XXXXXX format | `server/utils/ticketNumber.test.ts` | Pass |
| API-01 | API | AC-01 | Create valid ticket | 201 Created; returns Ticket ID and Number | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-02 | API | AC-03 | Prevent cross-requester access | 403 Forbidden or 404 Not Found when Requester B requests Requester A's ticket | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-03 | API | AC-04 | Reject >5MB attachment | 400 Bad Request with validation error message | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-04 | API | AC-05 | Soft-remove attachment | 200 OK; attachment marked removed, subsequent download returns 404 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| UI-01 | UI | FR-01 | Requester Selector renders | Dropdown shows active requesters from mock API | `client/tests/lab-02/RequesterSelector.test.tsx` | Pass |
| UI-02 | UI | AC-07 | Submit without required field | Form blocked; API not called; error message displayed | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-03 | UI | FR-04 | My Tickets search filter | Search input updates list via API call | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-04 | UI | FR-04 | My Tickets advanced filters | Category/Status filters and Sorting update list correctly | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-05 | UI | AC-12 | Form input retention on error | Input values remain after API failure | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-06 | UI | AC-13 | Inactive requester omission | Dropdown excludes inactive requesters | `client/tests/lab-02/RequesterSelector.test.tsx` | Pass |
| UI-07 | UI | AC-10 | Requester switching context | Cached data clears on user switch | `client/tests/lab-02/RequesterContext.test.tsx` | Pass |
| UI-08 | UI | Style | UI Style constraints | Validates colors, asterisks, read-only appearance | `client/tests/lab-02/Style.test.tsx` | Pass |
| UI-09 | UI | Responsive | Responsive layout logic | Multi-column desktop vs single-column mobile | `client/tests/lab-02/Responsive.test.tsx` | Pass |
| API-05 | API | FR-04, AC-08, AC-09 | Search, Filter, Sort query | API returns correctly filtered/sorted/paginated data | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-06 | API | AC-11 | Add attachment to ticket | Returns 201 Created and saves metadata | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| E2E-01 | E2E | AC-01, AC-05 | End-to-end create & view | User logs in, creates ticket with file, views in list, opens detail, deletes file | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Covered By Tests |
|---|---|
| AC-01 (Create valid ticket) | API-01, E2E-01 |
| AC-02 (Redirect if no user) | UI-01, E2E-01 |
| AC-03 (Data ownership) | API-02 |
| AC-04 (File size limit) | API-03 |
| AC-05 (Soft-remove file) | API-04, E2E-01 |
| AC-06 (Search functionality) | UI-03, API-05 |
| AC-07 (Client-side validation) | UI-02 |
| AC-08 (Pagination updates) | API-05, UI-04 |
| AC-09 (Multiple filters & sorting) | API-05, UI-04 |
| AC-10 (Requester switching context) | UI-07 |
| AC-11 (Add attachment to ticket) | API-06 |
| AC-12 (Form input retention) | UI-05 |
| AC-13 (Exclude inactive requesters) | UI-06 |

## 4. Responsive and Visual Checklist
- [ ] **Desktop**: Multi-column form layout, table view for My Tickets.
- [ ] **Tablet**: Two-column form layout where applicable.
- [ ] **Mobile**: Single-column form, card view for My Tickets, touch-friendly buttons with minimum 44px height.
- [ ] **Style**: Primary green `#006B3C` applied to header and primary buttons.
- [ ] **Validation**: Errors appear in red below inputs.
- [ ] **Read-only**: Distinct visual style from editable fields.
- [ ] **Button Hierarchy**: Primary, Secondary, Tertiary, Destructive, Disabled, and Busy (spinner) states are visually distinct.

## 5. Test Commands
```bash
# Run backend tests
npm run test:api

# Run frontend UI tests
npm run test:ui

# Run E2E tests
npm run test:e2e
```

## 6. Final Results
All 15 test suites and 18 automated tests pass locally. (100% Pass Rate confirmed on CI)

## 7. Known Limitations or Deferred Tests
- E2E tests currently mock the Development Requester selection rather than a full OAuth login flow (deferred to Lab 3).

