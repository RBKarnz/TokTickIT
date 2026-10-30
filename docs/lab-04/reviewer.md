# Lab 4 — Peer Review Record

**Author:** <ธีรกาญจน์ น้อยรักษา> — <67070501062> — GitHub: @<RBKarnz>
**Peer reviewer:** <เมธิภัทร มั่นทรัพย์> — <67070501071> — GitHub: @<Bobbie-CPE38>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #52 | feature/lab4-specs | Approved |
| #61 | feature/lab4-lab3-tech-debt | Approved |
| #62 | feature/lab4-data-foundation | Approved |
| #63 | feature/lab4-actions-taken-api | Approved |
| #64 | feature/lab4-actions-taken-ui | Approved |
| #65 | feature/lab4-ticket-workflow | Approved |
| #66 | feature/lab4-dashboards | Approved |
| #67 | feature/lab4-hardening | Approved |

### Reviewer comments I received

### PR #52: feature/lab4-specs
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/52
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/53
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    ## Recommended Actions

    To ensure complete alignment and consistency across all documentation:

    1. **Update [`docs/lab-04/api-spec.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-04/api-spec.md#L333):**
       - Document `ownership=assigned|unassigned` under Section 6.1.
    2. **Update [`docs/lab-04/ui-spec.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-04/ui-spec.md#L72):**
       - Add `Search Tickets -> /staff/queue` to IT Staff Dashboard Quick Actions.
    3. **Update [`docs/lab-04/specification.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-04/specification.md#L418):**
       - Add a brief note under Section 11 (Assumptions and Decisions) clarifying the alignment of Requester Dashboard Card 2 with Handout Section 4.6 and Rubric Part 8 ("attention-required Tickets").



    ---

    ### Requester Dashboard: Wireframe Card 2 ("In Progress") vs. Handout Text ("Waiting for Requester")
    - **Labsheet Reference:**
      - Section 4.6: *"Requester dashboard: total open Tickets, **Tickets waiting for the Requester**, recently updated Tickets, and recently resolved Tickets"*
      - Section 14 (Rubric Part 8): *"Demonstrate Requester-owned metrics, recent and **attention-required Tickets**, drill-down..."*
      - Section 8.2 (Page 6 Wireframe Screenshot): Shows Card 2 labeled **"In Progress (2)"** instead of "Waiting for Requester".
    - **Current State:**
      - Our specification adheres to Section 4.6 and Rubric Part 8 by using `waitingForMe` ("Waiting for Me", status `WAITING_FOR_REQUESTER`), which fulfills the rubric's "attention-required Tickets" criterion.
      - However, neither [`specification.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-04/specification.md) nor [`ui-spec.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-04/ui-spec.md) notes this intentional resolution of the wireframe conflict in Section 11 (Assumptions and Decisions).
    - **Impact:** Potential confusion during grading when comparing the wireframe screenshot to the actual card layout.
    - **Required Change:** Document in `specification.md` Section 11 (Assumptions and Decisions) why `waitingForMe` was prioritized over the wireframe's "In Progress" label, citing Section 4.6 and Rubric Part 8.
    ```

    **How I responded:**
    ```
    Updated! Mind doing a quick re-review when you have time?
    ```

    **Comment 2**
    ```
    Everything aligns with the Lab 4 labsheet now. 
    All feedback has been properly addressed.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Good to go from my side, please proceed with the merge.
    ```

### PR #61: feature/lab4-lab3-tech-debt
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/61
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/54
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    Looks good to me.

    All acceptance criteria and tests have been verified:
    - **CSRF Protection & Atomicity (AC-23, AC-24)**: State-changing requests without a valid CSRF token correctly return `403`. Concurrent status updates and last-admin demotions properly return `409 Conflict`.
    - **Automated Tests**:
      - Server Vitest: 16/16 files passed (189/189 tests)
      - Client: `tsc` and Vite build clean; 16/16 files passed (64/64 tests)
      - Playwright E2E: 315/315 passed across Desktop Chrome, Tablet, and Mobile Chrome
    - **Responsive & Style (AC-27)**: `STYLE-01..12` suite passes across all 3 viewports with unified `list-item` selectors.
    - **Docs & CI**: `docs/lab-03/` paths aligned and Project 3 board automation workflow configured.
    - **Integrity**: Database schema and Administrator permissions remain completely unchanged.
    ```

    **How I responded:**
    ```
    Thanks a lot for the thorough review and feedback! Feel free to merge.
    ```

### PR #62: feature/lab4-data-foundation
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/62
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/55
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    All required database changes are implemented strictly additively in a single migration, preserving all Lab 2–3 data and regression behavior while setting up robust fixtures for subsequent Lab 4 issues.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #63: feature/lab4-actions-taken-api
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/63
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/56
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    The changes in `feature/lab4-actions-taken-api` have been thoroughly reviewed, cross-referenced with the Lab 4 engineering specifications (`specification.md`, `api-spec.md`, `tests.md`) and labsheet (`SE+Lab+4.pdf`), and manually verified against the live environment.

    Good work. 
    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Feel free to merge it if no further changes are needed.
    ```

### PR #64: feature/lab4-actions-taken-ui
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/64
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/57
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    Verified against the Lab 4 spec and labsheet Part 6 rubric. All client (77/77) and server (239/239) tests pass, build is clean, and data retention/responsive behaviors are working as expected. 

    Tell me if you're ready to merge.
    ```

    **How I responded:**
    ```
    Everything looks good to go. Could you please help merge this PR?
    ```

### PR #65: feature/lab4-ticket-workflow
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/65
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/58
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    Approved.

    Reviewed `server/src/workflow.ts`, the client wiring, and the `app.ts` mount.

    - **Transition matrix and gate:** the status matrix is enforced server-side. `RESOLVED` is rejected with `409 RESOLUTION_GATE` unless there is a resolution summary, at least one completed Action Taken, and no open follow-up. The check runs inside the transaction, so a direct API call can't skip it.
    - **Optimistic concurrency:** the version check, plus a conditional `updateMany` on `version` and `currentStatus`, means a stale write returns `409 STALE_UPDATE` and never overwrites newer data.
    - **History:** exactly one append-only row is written in the same transaction as the status change. The history route is GET-only and ordered `createdAt ASC, id ASC`.
    - **Roles and Problem Appears Resolved:** Requesters get `403` on the status endpoints. `problem-appears-resolved` only sets a timestamp and never touches status.
    - **Client:** it sends `expectedVersion`, and the ticket detail response includes `version`. The Internal Notes wording leak and the stale Lab 3 tests are fixed.
    - **Typecheck:** the server typechecks cleanly.

    Non-blocking notes:
    1. The gate only reads `resolutionSummary` from the request body. If a Ticket already has a stored summary (for example `REOPENED` to `RESOLVED`), the caller must resend it. Falling back to the stored summary might be friendlier, if that matches the spec.
    2. I couldn't run the test suite locally because the Postgres container wasn't up. I'm relying on the pass counts in the PR description.
    ```

    **How I responded:**
    ```
    Currently working on the requested updates.
    ```

    **How I responded:**
    ```
    Updated! I've addressed all the requested changes. Please take a quick re-review, and if everything looks good, feel free to merge!
    ```

### PR #66: feature/lab4-dashboards
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/66
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/59
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    ## Request changes

    Nice work overall: the endpoints are well scoped (403 for the wrong role), the counts are single Prisma queries, empty states are zeros/`[]`, and test coverage is broad. I found one issue that breaks AC-18, so I'm requesting changes.

    ### 1. `myOpenActions` and `pendingFollowUps` count Actions, but their drill-downs list Tickets (AC-16 / AC-18)

    In `server/src/dashboard.ts` the two cards are computed with `prisma.actionTaken.count(...)`, which counts **action rows**:

    ```ts
    prisma.actionTaken.count({ where: { assignedToId: me, status: { in: OPEN_ACTION_STATUSES } } }),
    prisma.actionTaken.count({ where: { followUpRequired: true, status: { in: OPEN_ACTION_STATUSES } } }),
    ```

    The drill-downs (`/staff/queue?actionAssignee=me` and `?followUp=pending`, in `server/src/app.ts`) filter **tickets** with `actionsTaken: { some: ... }`, so each ticket appears once however many matching actions it has.

    **Failure scenario:** one ticket has 2 PLANNED actions assigned to the current IT Staff user. The card shows **2**, but the drill-down list shows **1** ticket. That violates "drill-down opens a list showing exactly the counted records" (AC-18) and the "matches a direct database query" claim for these cards (AC-16).

    The tests don't catch it because `staff-dashboard.api.test.ts` creates one action per ticket, and API-39 compares the queue total against a *ticket* count while API-36 compares the card against an *action* count. Those two only agree when each ticket has at most one matching action.

    **Suggested fix (either is fine, but pick one and document it):**
    - Count distinct tickets, e.g. `prisma.ticket.count({ where: { actionsTaken: { some: { assignedToId: me, status: { in: OPEN_ACTION_STATUSES } } } } })`, and the same for follow-ups, so the card and the list share the exact same `where`. Ideally share one helper between `dashboard.ts` and the staff queue so they can't drift.
    - Or, if the intent is to count actions, relabel the cards and make the drill-down an action list.

    Please also add a test with two matching actions on one ticket, asserting `card.count === queue.pagination.totalItems`.

    ### Minor (non-blocking)
    - `recentlyResolved` loads every `RESOLVED` ticket for the Requester and filters in JS. It's fine at current scale, but a `statusHistory: { some: { toStatus: 'RESOLVED', createdAt: { gte: cutoff } } }`-style filter would keep it in the DB. This also doesn't fully match the PR's "no server-side post-filtering" claim.
    - The PR description lists `docs/lab-04/tests.md` rows as Pass. Please re-verify the affected rows after the fix above.

    Happy to re-review once the count/drill-down mismatch is resolved.
    ```

    **Comment 2**
    ```
    ## Approved

    Re-reviewed the new commit `8d6ae23`. The issue from my previous review is fixed.

    - `myOpenActions` and `pendingFollowUps` now count distinct Tickets via `prisma.ticket.count`.
    - `myOpenActionsTicketFilter` and `pendingFollowUpsTicketFilter` are shared by the dashboard and the Staff Queue drill-down, so the card count and the list total can't drift apart (AC-16, AC-18).
    - New test API-39c puts two matching Actions on one Ticket and asserts that each card equals its drill-down `totalItems`. The API-36 comparison now uses the same Ticket-level filters.
    - Non-blocking item addressed: `recentlyResolved` is now filtered in the database (`statusHistory.some`, with `orderBy` and `take`) instead of in JS. The reasoning in the comment holds, because a currently RESOLVED Ticket's latest history row is its RESOLVED transition.
    - `tsc --noEmit` on the server is clean.

    Note: I could not run the dashboard suites locally (no seeded database on my side), so please confirm that CI or your local run is green before merging.
    ```

    **How I responded:**
    ```
    Feel free to merge if everything look good.
    ```

### PR #67: feature/lab4-hardening
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/67
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/60
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    Thanks for closing out the Lab 4 hardening. The Requester selector removal is clean, the SEC-07/SEC-08 tests are good, and the new E2E specs are well structured (each test creates its own ticket through the API). I'm requesting changes because a few rows in `tests.md` are marked **Pass** without the tests proving it, and some references to the removed code are still there.

    ### Changes requested

    1. **STYLE-03 can't fail (`e2e/lab-04/style.spec.ts`).**
       - The test only asserts `if (count > 0)`, so it passes when no badges render.
       - It checks that the badge text is non-empty, but `tests.md` says "text labels **and icons**". It never checks for icons.
       - Please assert at least one badge exists, and assert the icon or text cue the spec requires.

    2. **STYLE-08 returns silently (`style.spec.ts`).**
       - `if (!terminalOption) return;` means the test reports Pass without checking anything whenever the first queue ticket has no Cancelled or Resolved transition.
       - Please use the ticket you created via the API (as in the other specs) so the modal is always opened. Alternatively, use `test.skip` with a reason, so a skip isn't reported as a pass.

    3. **STYLE-04/05/06 count check never runs on narrower viewports.**
       - The `narrow || count >= 4` check is skipped at Tablet and Mobile.
       - The 2-column and 1-column layouts the spec lists are never asserted. The test only checks that nothing overflows.
       - Either assert the column layout per viewport, or reword the expected result in `tests.md` to match what is checked.

    4. **Stale references to the removed code (AC-26).**
       - `docs/lab-02/tests.md` UI-07 is still marked Pass and points at `client/tests/lab-02/RequesterContext.test.tsx`, which this PR deletes. Please remove or retire the row.
       - `client/src/api.ts:36` still exports `fetchRequesters`. It is dead code now. Please remove it, along with the `fetchRequesters` mocks in `client/tests/lab-02/Responsive.test.tsx` and `Style.test.tsx`.

    5. **E2E-12 mapping.**
       - You re-pointed it from `dashboards.spec.ts` to `lab-03/authentication.spec.ts` ("Core Regression") plus `e2e/lab-02/*`.
       - That is fine if intended, but that Lab 3 test only covers ticket creation. Please confirm it also covers attachment and comment, as the row says, or list the specs that do.

    ### Minor (not blocking)
    - SEC-08's comment says the client never executes the payload. That is true today (I found no `dangerouslySetInnerHTML` on the branch), but the test only checks the API round-trip. A small client test that renders the payload as text would back up the claim.

    ### Note
    I reviewed the diff and searched the branch. I did not run the server, client or Playwright suites, so the reported counts (284, 97, 126 passing) are unverified by me.

    Once items 1-4 are fixed I'm happy to approve.
    ```

    **Comment 2**
    ```
    Approved. Thanks for the quick turnaround; every item from my previous review is addressed in 11a1413.

    - **STYLE-03:** it now creates its own CRITICAL ticket, requires the badge to exist, and checks for a text label or an icon.
    - **STYLE-08:** it now uses an API-created NEW ticket and asserts that `Cancelled` is offered. The silent early `return` is gone.
    - **STYLE-04/05/06:** it now measures the actual metric-card layout per viewport. Correcting the Tablet and Mobile expectations in `tests.md` to match the real `col-6 col-md-3` behavior was the right call.
    - **Dead code:**
      - `fetchRequesters`, the `/api/requesters` endpoint and the stale test mocks are removed. I found no remaining references on the branch.
      - Lab 2 UI-01, UI-06 and UI-07 are marked Retired with reasons, and the AC cross-references are updated.
    - **E2E-12:** it now maps to specific specs. I confirmed E2E-17, E2E-18 and E2E-21 exist in `staff-ticket-flow.spec.ts`.
    - **SEC-08:** the client render-level test is a nice addition.

    I reviewed the diff and searched the branch but did not run the test suites myself, so the pass counts in the PR description are unverified by me.
    ```

    **How I responded:**
    ```
    Good to go on my end. Press the merge button please!
    ```

--------------------------------------------------------------------------------------------------------

## Pull Requests I reviewed for my partner

### PR #43: docs/lab4-specs
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/43
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/42
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    ### specification.md
    - [x] โครงสร้างเอกสารครบทั้ง 11 หัวข้อตามที่กำหนดใน Handout Section 9 เป๊ะ
    - [x] กฎทางธุรกิจ BR-01 และ BR-02 ตรงตามตัวอย่างบังคับใน Handout 4.4
    - [x] กฎข้อต่อๆ ไปครอบคลุมครบ ทั้งการตรวจเงื่อนไข Follow-up Note (BR-05), เงื่อนไข Resolution Gate (BR-09), และการตรวจ Optimistic Concurrency (BR-12)
    - [x] Section 7.2 ระบุเหตุผลการออกแบบฐานข้อมูล 2 ข้อชัดเจน (การแยก Foreign Key ผู้ลงมือทำ และการใช้ updatedAt ป้องกันข้อมูลชนกัน)
    - [ ] ยังไม่ได้ระบุเหตุผลเรื่อง Append-only ใน specification.md ให้ชัดเจนว่าจงใจตัดฟังก์ชันลบ (DELETE) ของ Action Taken ออกเพื่อรักษาประวัติการทำงาน (Audit Trail)

    ### ui-spec.md
    - [x] ภาพร่างหน้าจอ IT Staff Dashboard มีตัวเลข KPI ตรงตาม Handout Section 8.1 / หน้า 5 ครบถ้วน (New: 14, Open: 23, In Progress: 18, Waiting: 7, Assigned: 16 พร้อม Recent Tickets และ Quick Actions)
    - [ ] การ์ดบน Requester Dashboard ใน ui-spec.md มี 5 ใบ ซึ่งไม่ตรงกับภาพร่างใน Handout หน้า 6 ที่มีเพียง 4 ใบ (มีการใส่การ์ด Waiting for Me เพิ่มเข้ามา) ต้องระบุการจัดแถวบนแท็บเล็ตและมือถือให้ชัดเจนเพื่อป้องกันหน้าจอแตก
    - [x] Actions Taken รองรับครบทั้ง 3 โหมด (List, Create, View/Edit) และ Requester ได้มุมมองแบบอ่านอย่างเดียว (Read-only) โดยซ่อนปุ่มสร้างและปุ่มแก้ไขทั้งหมด
    - [x] Section 10 มีตาราง Visual and Accessibility Checklist ตรวจสอบครบทุกข้อ
    - [ ] ใน ui-spec.md ขาดการระบุเพดานความยาวสูงสุด 1,000 ตัวอักษรของ Follow-up Note ในฟอร์มหน้าจอ อาจทำให้ผู้ใช้กรอกเกินแล้วถูกระบบปฏิเสธด้วย Error 422 โดยไม่รู้ตัว

    ### api-spec.md
    - [x] ตารางสิทธิ์การเข้าถึง (Role-Based Authorization Matrix) กำหนดขอบเขตถูกต้องและปลอดภัยสำหรับ Actions Taken, Dashboards และการเปลี่ยนสถานะตั๋ว
    - [x] กลไก Optimistic Concurrency ส่งกลับ HTTP 409 Conflict พร้อมรายละเอียด เมื่อ expectedUpdatedAt ไม่ตรงกับฐานข้อมูล
    - [x] กลไก Resolution Gate ส่งกลับ HTTP 422 Unprocessable Entity เมื่อแก้สถานะเป็น RESOLVED ในตั๋วที่ไม่มี Action Taken หรือไม่มีข้อความสรุปการแก้ปัญหา
    - [ ] รายละเอียด Concurrency ใน api-spec.md ขาดตัวอย่าง Schema และ Request/Response ของ Endpoint มอบหมายงาน (assignment) และปรับระดับความสำคัญ (priority) โดยมีระบุละเอียดแค่ที่ Endpoint เปลี่ยนสถานะ (status) เท่านั้น

    ### tests.md และไฟล์ส่งมอบ
    - [x] โครงสร้างโฟลเดอร์ไฟล์ทดสอบตรงตาม Handout Section 12 ครบทุกระดับ (server/tests/lab-04/, client/tests/lab-04/, e2e/lab-04/)
    - [x] ชุดทดสอบบังคับ API-03 และ E2E-02 กำหนดการทำงานตรงตาม Handout Section 10
    - [x] ตาราง Traceability Matrix เชื่อมโยงเกณฑ์การยอมรับ AC-01 ถึง AC-16 เข้ากับรหัสชุดทดสอบอัตโนมัติครบ 100%
    - [ ] ในโฟลเดอร์ docs/lab-04/ ของ PR นี้ยังขาดไฟล์ reviewer.md และ ai-use.md ตามโครงสร้างบังคับของ Handout Section 12
    ```

    **Partner's response:**
    ```
    On it.

    Please note that the reviewer.md and ai-use.md won't be created for now.
    It'll be done at the very last PR before the merge.
    ```

    **My comment 2**
    ```
    ### specification.md
    - [x] โครงสร้างเอกสารครบทั้ง 11 หัวข้อตามที่กำหนดใน Handout Section 9 เป๊ะ
    - [x] กฎทางธุรกิจ BR-01 และ BR-02 ตรงตามตัวอย่างบังคับใน Handout 4.4
    - [x] กฎข้อต่อๆ ไปครอบคลุมครบ ทั้งการตรวจเงื่อนไข Follow-up Note (BR-05), เงื่อนไข Resolution Gate (BR-09), และการตรวจ Optimistic Concurrency (BR-12)
    - [x] Section 7.2 ระบุเหตุผลการออกแบบฐานข้อมูล 2 ข้อชัดเจน (การแยก Foreign Key ผู้ลงมือทำ และการใช้ updatedAt ป้องกันข้อมูลชนกัน)
    - [x] ระบุเหตุผลพฤติกรรมแบบ Append-only ใน BR-08 และ Decision ข้อ 10 ชัดเจนว่าจงใจตัดคำสั่งลบ (DELETE) ของ Action Taken ออกอย่างถาวร เพื่อรักษาประวัติการทำงาน (Audit Trail) ให้โปร่งใสและตรวจสอบย้อนหลังได้

    ### ui-spec.md
    - [x] ภาพร่างหน้าจอ IT Staff Dashboard มีตัวเลข KPI ตรงตาม Handout Section 8.1 / หน้า 5 ครบถ้วน (New: 14, Open: 23, In Progress: 18, Waiting: 7, Assigned: 16 พร้อม Recent Tickets และ Quick Actions)
    - [x] การ์ดบน Requester Dashboard ปรับเหลือ 4 ใบหลักตามภาพร่าง Handout หน้า 6 เป๊ะ พร้อมแยกการเตือนตั๋วที่รอ Requester ตอบกลับไว้ใน Recent Tickets และกำหนดการจัดหน้าจอ Responsive แบบ 4 คอลัมน์ (Desktop), 2x2 (Tablet), และ 2 คอลัมน์ (Mobile) ไว้อย่างชัดเจน
    - [x] Actions Taken รองรับครบทั้ง 3 โหมด (List, Create, View/Edit) และ Requester ได้มุมมองแบบอ่านอย่างเดียว (Read-only) โดยซ่อนปุ่มสร้างและปุ่มแก้ไขทั้งหมด
    - [x] Section 10 มีตาราง Visual and Accessibility Checklist ตรวจสอบครบทุกข้อ
    - [x] ฟอร์มหน้าจอระบุคุณสมบัติ maxLength={1000} และตัวนับจำนวนตัวอักษรแบบแสดงผลทันทีสำหรับ Follow-up Note เพื่อป้องกันข้อผิดพลาดก่อนส่งไปยัง Backend

    ### api-spec.md
    - [x] ตารางสิทธิ์การเข้าถึง (Role-Based Authorization Matrix) กำหนดขอบเขตถูกต้องและปลอดภัยสำหรับ Actions Taken, Dashboards และการเปลี่ยนสถานะตั๋ว
    - [x] กลไก Optimistic Concurrency ส่งกลับ HTTP 409 Conflict พร้อมรายละเอียด เมื่อ expectedUpdatedAt ไม่ตรงกับฐานข้อมูล
    - [x] กลไก Resolution Gate ส่งกลับ HTTP 422 Unprocessable Entity เมื่อแก้สถานะเป็น RESOLVED ในตั๋วที่ไม่มี Action Taken หรือไม่มีข้อความสรุปการแก้ปัญหา
    - [x] เพิ่มรายละเอียด Schema, Request Body, การส่งกลับ HTTP 409 Conflict และกรณีข้อผิดพลาด HTTP 422 ครอบคลุมทั้ง Endpoint มอบหมายงาน (assignment) และปรับระดับความสำคัญ (priority) ครบถ้วนตาม BR-12

    ### tests.md และไฟล์ส่งมอบ
    - [x] โครงสร้างโฟลเดอร์ไฟล์ทดสอบตรงตาม Handout Section 12 ครบทุกระดับ (server/tests/lab-04/, client/tests/lab-04/, e2e/lab-04/)
    - [x] ชุดทดสอบบังคับ API-03 และ E2E-02 กำหนดการทำงานตรงตาม Handout Section 10
    - [x] ตาราง Traceability Matrix เชื่อมโยงเกณฑ์การยอมรับ AC-01 ถึง AC-16 เข้ากับรหัสชุดทดสอบอัตโนมัติครบ 100%
    - [x] ส่งมอบเอกสารหลักครบทั้ง 4 ไฟล์ตาม Handout Section 9 สำหรับการตรวจ Engineering Contract (โดย reviewer.md และ ai-use.md มีแผนจัดทำและบันทึกเพิ่มเติมในขั้นตอนการสรุปผลรอบถัดไป)
    ```

    **Partner's response:**
    ```
    I'm ready for the merge.
    ```

    **My comment 3**
    ```
    Awesome work! Merging it in right now.
    ```

### PR #49: feature/lab4-actions-taken-foundation
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/49
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/44
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    ลองรันและ test จริงครบแล้ว ทั้ง TypeScript, Vitest และยิง API ตาม Step 3.1 - 3.9 ทุกอย่างทำงานถูกต้อง ติดแค่เรื่องเลข ID ใน How to Test 

    - [x] TypeScript ฝั่ง Server และ Client ไม่มี error
    - [x] Vitest ผ่านหมด (14 ไฟล์ 112 เทสต์) และของเดิมใน Lab 1-3 ไม่พัง
    - [x] app.ts ยาว 33 บรรทัด ไม่เกิน 100 และลำดับการเรียกใช้ระหว่างไฟล์ถูกต้อง
    - [x] Migration สร้างตาราง actions_taken ถูกต้อง ส่วน seed.ts รันซ้ำได้โดยข้อมูลไม่ซ้ำ
    - [x] Actions Taken ทำงานถูก: ใส่ชื่อคนทำงานให้อัตโนมัติ, คนทำงานไม่ต้องเป็นเจ้าของตั๋ว, เช็ก Follow-up Note ได้
    - [x] สิทธิ์ถูกต้อง: Requester ดูตั๋วตัวเองได้, สร้างงานไม่ได้ ได้ 403, ดูตั๋วคนอื่นได้ 404 ไม่หลุดข้อมูล
    - [x] เพิ่มข้อมูลได้อย่างเดียว ไม่มี route DELETE ประวัติเลยไม่หาย
    - [ ] ใน How to Test ตั้งแต่ Step 3.2 ถึง 3.9 เขียนเลข ID ตายตัวหมดเลย (ทั้ง /tickets/1, /tickets/19 และ /actions-taken/1) ถ้ารัน npm test ใน Step 1 ไปก่อน เลข ID ใน PostgreSQL จะเลื่อน ทำให้ยิงตามแล้วติด 404 หาไม่เจอ ควรแก้คำอธิบายให้ใช้เป็นตัวแปรอย่าง <TICKET_ID> กับ <ACTION_ID> หรือบอกวิธีเช็คเลข ID จริงใน DB ก่อนยิง

    **สรุป:** ระบบใช้ได้ครบแล้ว ขอแก้คู่มือตรงเลข ID ให้เป็นตัวแปร เช่น `<TICKET_ID>` หรือใส่หมายเหตุบอกวิธีดู ID จริงในฐานข้อมูล แก้เสร็จแล้วเดี๋ยว Approve ให้
    ```

    **Partner's response:**
    ```
    I've updated testing instruction accordingly.

     Can you please check it out?
    ```

    **My comment 2**
    ```
    - [x] TypeScript ฝั่ง Server และ Client ไม่มี error
    - [x] Vitest ผ่านหมด (14 ไฟล์ 112 เทสต์) และของเดิมใน Lab 1-3 ไม่พัง
    - [x] app.ts ยาว 33 บรรทัด ไม่เกิน 100 และลำดับการเรียกใช้ระหว่างไฟล์ถูกต้อง
    - [x] Migration สร้างตาราง actions_taken ถูกต้อง ส่วน seed.ts รันซ้ำได้โดยข้อมูลไม่ซ้ำ
    - [x] Actions Taken ทำงานถูก: ใส่ชื่อคนทำงานให้อัตโนมัติ, คนทำงานไม่ต้องเป็นเจ้าของตั๋ว, เช็ก Follow-up Note ได้
    - [x] สิทธิ์ถูกต้อง: Requester ดูตั๋วตัวเองได้, สร้างงานไม่ได้ ได้ 403, ดูตั๋วคนอื่นได้ 404 ไม่หลุดข้อมูล
    - [x] เพิ่มข้อมูลได้อย่างเดียว ไม่มี route DELETE ประวัติเลยไม่หาย
    - [x]  How to Test ใน Step 3.2 ถึง 3.9 ปรับคำอธิบายให้ใช้ตัวแปร <TICKET_ID> กับ <ACTION_ID> แทนเลขตายตัวแล้ว ทำให้ยิงทดสอบตามได้จริงไม่ติด 404 แม้เลข ID ในฐานข้อมูลจะเลื่อนหลังรันเทสต์ 
    ```

    **Partner's response:**
    ```
    Please proceed to merge if you feel like it. 
    ```

### PR #50: feature/lab4-actions-taken-ui
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/50
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/45
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง client ผ่านครบ 70 เทสต์ และ npx tsc --noEmit ทั้งฝั่ง client และ server ไม่แสดง error ใด ๆ
    - [x] ฝั่ง IT Staff แท็บ Actions Taken อยู่ถัดจาก Attachments ถูกต้อง กดแล้วโหลดทันทีไม่ค้างหมุน ถ้ายังไม่มีรายการจะขึ้นข้อความว่าง ตอนกด + Record Action Taken ฟอร์มตั้งวันเวลาเป็นปัจจุบัน และช่อง Follow-up ยังไม่ถูกติ๊ก ถ้าติ๊กช่องโน้ตจะโผล่ขึ้นมา กดบันทึกตอนยังไม่กรอกจะไม่ส่งข้อมูลไปที่ server ตอนกำลังบันทึกปุ่มจะล็อกพร้อมแสดงสถานะกำลังโหลด และพอบันทึกเสร็จการ์ดใหม่ขึ้นพร้อมตัวเลขบนแท็บเพิ่มขึ้น
    - [x] การแก้ไขรายการทำงานถูกต้อง ฟอร์มดึงค่าเดิมมาครบ พอเอาติ๊ก Follow-up ออกแล้วบันทึก ป้ายสถานะเปลี่ยนเป็น Action Complete และโน้ตหายไป รีเฟรชหน้าแล้วข้อมูลยังอยู่ ส่วนกรณีเน็ตหลุดตอนบันทึก จะมีกล่องแจ้งเตือนสีแดงขึ้น และข้อความที่กรอกไว้ยังอยู่ครบ
    - [x] ฝั่ง Requester เห็นรายการทั้งหมดแบบอ่านอย่างเดียว ไม่มีปุ่มสร้าง แก้ไข หรือลบ และไม่มีแท็บ Internal Notes ลองยิงคำสั่งลบไปที่ server ตรง ๆ ทั้งสองเส้นทางก็ได้ 404 และข้อมูลยังอยู่ครบ แปลว่าไม่มีทางลบรายการจริง
    - [ ] การ์ดของ Actions Taken ไม่แสดง role ของคนที่ทำ ตอนนี้ขึ้นแค่ชื่อ เช่น "Performed by: Michael Brown" แต่ใน ui-spec ข้อ 7.1 กับ 7.2 กำหนดให้มีทั้งชื่อและ role เช่น "Michael Brown [ IT Staff ]" แนะนำให้เพิ่ม role ต่อท้ายชื่อในการ์ด
    - [ ] รายละเอียดบางจุดไม่ตรงกับคำอธิบายใน PR
      - ตัวนับตัวอักษรของ Follow-up Note ขึ้นเป็น "0 / 1000" แต่ในขั้นตอนทดสอบเขียนว่า "0 / 1,000" และช่องอื่นใช้ "2,000" แบบมีลูกน้ำ ควรทำให้เหมือนกัน
      - สีของป้าย Follow-Up Required กับ Action Complete ตรงกับโค้ดจริง แต่โค้ดตรงกับ ui-spec แล้วควรแก้แค่คำอธิบายใน PR
      - คำอธิบาย PR บอกว่าเทสต์ไม่มี warning แต่ตอนรันมี warning เรื่อง act(...) ในเทสต์ของ Lab 2 อันนี้มีมาตั้งแต่ก่อน PR นี้แล้ว ควรแก้คำอธิบายให้ตรง
    ```

    **Partner's response:**
    ```
    Roger! Working on it.
    ```

    **My comment 2**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง client ผ่านครบ 70 เทสต์ และ npx tsc --noEmit ทั้งฝั่ง client และ server ไม่แสดง error ใด ๆ
    - [x] ฝั่ง IT Staff แท็บ Actions Taken อยู่ถัดจาก Attachments ถูกต้อง กดแล้วโหลดทันทีไม่ค้างหมุน ถ้ายังไม่มีรายการจะขึ้นข้อความว่าง ฟอร์มตั้งวันเวลาเป็นปัจจุบัน ติ๊ก Follow-up แล้วช่องโน้ตโผล่ขึ้นมา กดบันทึกตอนยังไม่กรอกจะไม่ส่งข้อมูลไปที่ server ตอนกำลังบันทึกปุ่มจะล็อก และพอบันทึกเสร็จการ์ดใหม่ขึ้นพร้อมตัวเลขบนแท็บเพิ่มขึ้น
    - [x] การแก้ไขรายการทำงานถูกต้อง ฟอร์มดึงค่าเดิมมาครบ พอเอาติ๊ก Follow-up ออกแล้วบันทึก ป้ายสถานะเปลี่ยนเป็น Action Complete และโน้ตหายไป รีเฟรชหน้าแล้วข้อมูลยังอยู่ ส่วนกรณีเน็ตหลุดตอนบันทึก จะมีกล่องแจ้งเตือนสีแดงขึ้นและข้อความที่กรอกไว้ยังอยู่ครบ
    - [x] ฝั่ง Requester เห็นรายการทั้งหมดแบบอ่านอย่างเดียว ไม่มีปุ่มสร้าง แก้ไข หรือลบ และไม่มีแท็บ Internal Notes ลองยิงคำสั่งลบไปที่ server ตรง ๆ ก็ได้ 404 และข้อมูลยังอยู่ครบ
    - [x] แก้ตามรีวิวรอบก่อนครบแล้ว การ์ดแสดง role ต่อท้ายชื่อคนทำถูกต้อง ทั้ง IT Staff และ Administrator (ลองให้ Admin บันทึกจริงแล้วขึ้น Administrator ถูก) และ Requester ก็เห็น role ด้วย ตัวนับตัวอักษรทุกช่องใช้รูปแบบเดียวกันแล้ว และคำอธิบายใน PR เรื่องสีของป้ายสถานะกับ warning ของเทสต์ Lab 2 ก็ตรงกับของจริงแล้ว
    - [x] ตัวนับตัวอักษรของทุกช่องในฟอร์มแสดงรูปแบบเดียวกันแล้ว Description กับ Result ขึ้น "0 / 2000" และ Follow-up Note ขึ้น "0 / 1000" ตัวเลขเปลี่ยนตามที่พิมพ์ทันที และตอนเน็ตหลุดขณะบันทึก ระบบแสดงกล่องแจ้งเตือนสีแดง โดยข้อความที่กรอกไว้ยังอยู่ครบ ไม่หายไป
    ```

    **Partner's response:**
    ```
    Thanks. I'm ready for the merge.
    ```

### PR #51: feature/lab4-ticket-workflow
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/51
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/46
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] Prerequisites ทำตามได้ครบ docker ขึ้นปกติ รัน npm run prisma:seed ผ่าน (users 11, tickets 25, actions taken 10) เปิด server กับ client แล้วเข้า http://localhost:5173 ได้
    - [x] Scenario 1 ผ่าน ตั๋วใหม่ขึ้นสถานะ NEW dropdown มีแค่ Open, In Progress, Cancelled ไม่มี Resolved กับ Closed พอเลือก In Progress ขึ้นแถบเขียว "Ticket status transitioned to IN_PROGRESS." และ dropdown เปลี่ยนเป็น Waiting for Requester, Resolved, Cancelled ทันที
    - [x] Scenario 2 ผ่าน ตอน Actions Taken (0) เลือก Resolved แล้วขึ้น modal Resolve Ticket พร้อมคำเตือน Resolution Gate ปุ่ม Confirm Resolution กดไม่ได้ ปิดได้ทั้งปุ่ม Cancel และ ✕ สถานะยังเป็น IN_PROGRESS แม้รีเฟรชหน้า
    - [x] Scenario 3 ผ่าน บันทึก action แล้วขึ้นในรายการ แท็บเปลี่ยนเป็น Actions Taken (1) เปิด modal อีกรอบคำเตือนหายไป ตัวนับขึ้น "0 / 1000 characters" พิมพ์ Done ได้ "4 / 1000 characters" พร้อมข้อความแดง Minimum 5 characters required และปุ่มยังล็อก พอกรอกครบได้ "68 / 1000 characters" ปุ่มกดได้ กดแล้วขึ้น "Ticket status transitioned to RESOLVED." และกล่อง Resolution Summary สีเขียวอ่อนแสดงข้อความที่กรอก
    - [x] Scenario 4 ผ่าน Requester กด Mark as Resolved แล้วยืนยัน ได้ 200 และ isRequesterResolved = true ฝั่ง IT Staff เปิดตั๋วจาก My Queue เห็นแบนเนอร์เขียวอ่อนครบสองบรรทัด ส่วน Current Status ยังเป็น NEW ไม่เปลี่ยนเป็น RESOLVED เอง รีเฟรชแล้วแบนเนอร์ยังอยู่
    - [x] Scenario 5 ผ่าน Window B เปลี่ยน IT Priority เป็น Urgent แล้ว Window A เปลี่ยนสถานะ ได้ 409 พร้อม currentUpdatedAt ขึ้น dialog Stale Record Detected ข้อความกับปุ่มตรงตามคู่มือ กด Keep My Drafts & Refresh แล้ว IT Priority เป็น Urgent ข้อความ draft ในช่อง Public Comment ยังอยู่ครบ เปลี่ยนสถานะอีกรอบได้ 200
    - [x] Scenario 6 ผ่าน server 119 เทสต์ client 73 เทสต์ Playwright ticket-resolution 6/6 (Desktop, Tablet, Mobile) และ npx tsc --noEmit ทั้งสองฝั่งไม่มี error
    - [x] Guardrails ผ่าน app.ts 33 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features และเทสต์ Lab 2 ไม่ถูกแก้
    - [ ] คู่มือกับคำอธิบาย PR ไม่ตรงกับของจริง 3 จุด
      - Scenario 1 ข้อ 3 กับ Scenario 4 ข้อ 4 เขียนว่ากด Submit Ticket แล้วเข้า Ticket Detail เลย แต่ของจริงขึ้นหน้า "Ticket Created Successfully" ที่ /tickets/new ฝั่ง IT Staff ต้องกด Back to My Tickets แล้วเปิดตั๋วจาก My Queue เอง ฝั่ง Requester ต้องกลับไป My Tickets แล้วกดเข้าตั๋ว ควรเพิ่มขั้นตอนนี้ในคู่มือ
      - Scenario 1 ข้อ 4-5 เขียนชื่อสถานะเป็น Open, In Progress แต่ใน dropdown ขึ้นตัวพิมพ์ใหญ่ทั้งหมด เช่น OPEN, IN PROGRESS, WAITING FOR REQUESTER ควรแก้ให้ตรงกัน
      - คำอธิบาย PR บอกว่า Lab 2 มี 43 เทสต์ใน server/tests/lab-02/ แต่รันจริงได้ 41 เทสต์ (ผ่านหมด) ควรแก้ตัวเลข
    ```

    **Partner's response:** *(no response was posted before the follow-up review below)*

    **My comment 2**
    ```
    - [x] Prerequisites ทำตามได้ครบ docker ขึ้นปกติ รัน npm run prisma:seed ผ่าน (users 11, tickets 25, actions taken 10) เปิด server กับ client แล้วเข้า http://localhost:5173 ได้
    - [x] Scenario 1 ผ่าน ตั๋วใหม่ขึ้นสถานะ NEW dropdown มีแค่ Open, In Progress, Cancelled ไม่มี Resolved กับ Closed พอเลือก In Progress ขึ้นแถบเขียว "Ticket status transitioned to IN_PROGRESS." และ dropdown เปลี่ยนเป็น Waiting for Requester, Resolved, Cancelled ทันที
    - [x] Scenario 2 ผ่าน ตอน Actions Taken (0) เลือก Resolved แล้วขึ้น modal Resolve Ticket พร้อมคำเตือน Resolution Gate ปุ่ม Confirm Resolution กดไม่ได้ ปิดได้ทั้งปุ่ม Cancel และ ✕ สถานะยังเป็น IN_PROGRESS แม้รีเฟรชหน้า
    - [x] Scenario 3 ผ่าน บันทึก action แล้วขึ้นในรายการ แท็บเปลี่ยนเป็น Actions Taken (1) เปิด modal อีกรอบคำเตือนหายไป ตัวนับขึ้น "0 / 1000 characters" พิมพ์ Done ได้ "4 / 1000 characters" พร้อมข้อความแดง Minimum 5 characters required และปุ่มยังล็อก พอกรอกครบได้ "68 / 1000 characters" ปุ่มกดได้ กดแล้วขึ้น "Ticket status transitioned to RESOLVED." และกล่อง Resolution Summary สีเขียวอ่อนแสดงข้อความที่กรอก
    - [x] Scenario 4 ผ่าน Requester กด Mark as Resolved แล้วยืนยัน ได้ 200 และ isRequesterResolved = true ฝั่ง IT Staff เปิดตั๋วจาก My Queue เห็นแบนเนอร์เขียวอ่อนครบสองบรรทัด ส่วน Current Status ยังเป็น NEW ไม่เปลี่ยนเป็น RESOLVED เอง รีเฟรชแล้วแบนเนอร์ยังอยู่
    - [x] Scenario 5 ผ่าน Window B เปลี่ยน IT Priority เป็น Urgent แล้ว Window A เปลี่ยนสถานะ ได้ 409 พร้อม currentUpdatedAt ขึ้น dialog Stale Record Detected ข้อความกับปุ่มตรงตามคู่มือ กด Keep My Drafts & Refresh แล้ว IT Priority เป็น Urgent ข้อความ draft ในช่อง Public Comment ยังอยู่ครบ เปลี่ยนสถานะอีกรอบได้ 200
    - [x] Scenario 6 ผ่าน server 119 เทสต์ client 73 เทสต์ Playwright ticket-resolution 6/6 (Desktop, Tablet, Mobile) และ npx tsc --noEmit ทั้งสองฝั่งไม่มี error
    - [x] Guardrails ผ่าน app.ts 33 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features และเทสต์ Lab 2 ไม่ถูกแก้
    - [x] คู่มือกับคำอธิบาย PR แก้ให้ตรงกับของจริงแล้ว
      - Scenario 1 ข้อ 3 และ Scenario 4 ข้อ 4 — เพิ่มขั้นตอนที่ขาดไปแล้ว: หลังกด Submit Ticket ระบบจะพาไปหน้า "Ticket Created Successfully" ที่ /tickets/new ก่อน ฝั่ง IT Staff ต้องกด Back to My Tickets แล้วเปิดตั๋วจาก My Queue เอง ฝั่ง Requester ต้องกลับไป My Tickets แล้วกดเข้าตั๋วเอง คู่มือตรงกับของจริงแล้ว
      - Scenario 1 ข้อ 4-5 — แก้ชื่อสถานะในคู่มือให้เป็นตัวพิมพ์ใหญ่ทั้งหมด (OPEN, IN PROGRESS, WAITING FOR REQUESTER) ให้ตรงกับ dropdown ของจริงแล้ว
      - คำอธิบาย PR — แก้จำนวนเทสต์ Lab 2 ให้ตรงกับที่รันได้จริง (41 เทสต์ ผ่านหมด) แทนตัวเลขเดิมที่ผิด
    ```

    **Partner's response:**
    ```
    Thanks.

    Feel free to merge.
    ```

### PR #52: feature/lab4-project-automation
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/52
- **Issue** *(no linked Issue)*
- **Comment:** 
 **A reviewer comment was received by me:**
    No review comments or issue comments are recorded on this PR on GitHub — it was merged without a review exchange.

### PR #53: docs/lab4-agents-board-workflow
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/53
- **Issue** *(no linked Issue)*
- **Comment:** 
 **A reviewer comment was received by me:**
    No review comments or issue comments are recorded on this PR on GitHub — it was merged without a review exchange.

### PR #54: feature/lab4-role-dashboards
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/54
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/47
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน (server 132/132, client 90/90, tsc ทั้งสองฝั่งไม่มี error, e2e/lab-04/dashboards.spec.ts 9/9 ผ่านทั้ง desktop/tablet/mobile)
    - [x] แยกสิทธิ์ตาม role ถูกต้องจริง ลองยิง API ตรงพบว่า /api/dashboards/requester คืนข้อมูลเฉพาะของ requester คนนั้น (scoped ด้วย requesterId) ยิง /api/dashboards/staff ด้วย token requester ได้ 403 ตามที่ควร
    - [x] filter=open บน GET /api/tickets ทำงานถูก ส่วน filter อื่นที่ไม่รู้จักได้ 400 ตามที่อธิบายไว้
    - [x] Trend delta คำนวณจาก baseline เที่ยงคืน UTC ตรงตามที่เขียนไว้ใน BR-15 ตรวจโค้ด getUtcDayStart และ calculateTrendDelta แล้วตรงกัน
    - [x] Guardrails ผ่าน app.ts 35 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features
    - [x] Login ยัง landing ที่ /queue, /tickets, /admin/users ตามเดิม ส่วน /dashboard เป็น route แยกไม่กระทบ regression ตรวจโค้ด RouteGuard แล้วตรงกับ Decision 1 ที่อธิบายไว้
    - [ ] คำอธิบาย PR เขียนว่า "including all 43 Lab 2 tests unmodified" แต่รันจริงนับได้ 41 เทสต์ใน server/tests/lab-02/ (ผ่านหมด) ตัวเลขผิดเหมือนที่เคยแจ้งใน PR #51 ควรแก้ให้ตรง
    - [ ] Decision 4 บอกว่า Admin dashboard ไม่มีปุ่ม Create Ticket เพราะ "admins get 403 on POST /api/tickets" แต่ลองยิง API ตรงด้วย token admin ได้ 201 สร้างตั๋วสำเร็จ และโค้ด client ที่ RouteGuard.tsx ก็อนุญาตให้ ADMINISTRATOR เข้าถึง view "create-ticket" ด้วย (ไม่ได้บล็อก) เท่ากับว่า Admin เข้า URL /tickets/new ตรง ๆ แล้วสร้างตั๋วได้จริง ไม่ตรงกับเหตุผลที่ให้ไว้ ควรแก้คำอธิบายให้ตรงกับของจริง หรือถ้าตั้งใจจะบล็อก Admin จริง ๆ ต้องเพิ่ม role check ที่ backend route และ RouteGuard ด้วย
    ```

    **Partner's response:**
    ```
    Thanks for the review. Both points are fixed.

    **1. Lab 2 test count:** confirmed, `server/tests/lab-02/` has 41 tests. I changed 43 to 41 in the PR description. `AGENTS.md` and `tests.md` (API-23) still say 43, but that's outside this PR; I'll raise it in final hardening.

    **2. Admin and Create Ticket:** confirmed. `POST /api/tickets` has no role check, so an admin gets 201, and `RouteGuard` allows `/tickets/new`. My original reason was wrong. I chose to correct the explanation rather than block admins, because changing who can create tickets belongs to the tickets feature, not this dashboards issue.
    - Fixed the comment in `AdminDashboard.tsx` (commit `fix(dashboards): correct admin Create Ticket rationale comment`). The real reason is that each role's quick actions mirror its nav in ui-spec §4.1, and the Administrator nav has only Dashboard and Admin.
    - Updated the decision in the PR description. It now notes that the code disagrees with api-spec §1.2, which says admins should get 403, and leaves final hardening to decide whether to enforce the spec or change it.

    After the fix, Lab 4 client tests pass 25/25 and `tsc` reports no errors.
    ```

    **My comment 2**
    ```
    - [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน (server 132/132, client 90/90, tsc ทั้งสองฝั่งไม่มี error, e2e/lab-04/dashboards.spec.ts 9/9 ผ่านทั้ง desktop/tablet/mobile)
    - [x] แยกสิทธิ์ตาม role ถูกต้องจริง ลองยิง API ตรงพบว่า /api/dashboards/requester คืนข้อมูลเฉพาะของ requester คนนั้น (scoped ด้วย requesterId) ยิง /api/dashboards/staff ด้วย token requester ได้ 403 ตามที่ควร
    - [x] filter=open บน GET /api/tickets ทำงานถูก ส่วน filter อื่นที่ไม่รู้จักได้ 400 ตามที่อธิบายไว้
    - [x] Trend delta คำนวณจาก baseline เที่ยงคืน UTC ตรงตามที่เขียนไว้ใน BR-15 ตรวจโค้ด getUtcDayStart และ calculateTrendDelta แล้วตรงกัน
    - [x] Guardrails ผ่าน app.ts 35 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features
    - [x] Login ยัง landing ที่ /queue, /tickets, /admin/users ตามเดิม ส่วน /dashboard เป็น route แยกไม่กระทบ regression ตรวจโค้ด RouteGuard แล้วตรงกับ Decision 1 ที่อธิบายไว้
    - [x] จำนวนเทสต์ Lab 2 — แก้คำอธิบาย PR จาก "43 Lab 2 tests" เป็น "41 Lab 2 tests in server/tests/lab-02/" ให้ตรงกับที่รันได้จริงแล้ว (ตรวจซ้ำแล้วนับได้ 41 จริง)
    - [x] คำอธิบายเรื่อง Admin สร้างตั๋วได้ — แก้ Decision 4 ในคำอธิบาย PR ยอมรับตรงๆ ว่าที่เขียนไว้ก่อนหน้าว่า "admin ได้ 403 ตอน POST /api/tickets" นั้นผิด เพราะ route ไม่มี role check จริง (admin ยิงแล้วได้ 201) และ RouteGuard ก็ยังให้ ADMINISTRATOR เปิด /tickets/new ได้ พร้อมอธิบายว่า api-spec กำหนดให้ Admin ต้องถูกบล็อก (403) แต่โค้ดกับสเปกยังขัดกันอยู่ และตั้งใจแยกเรื่องนี้ไปแก้ใน final-hardening แทน ไม่ใช่สโคปของ PR นี้ ส่วนในแดชบอร์ดก็แก้คอมเมนต์ในโค้ด AdminDashboard.tsx ให้บอกเหตุผลที่ถูกต้องว่าเพราะ ui-spec §4.1 ไม่มีปุ่ม Create Ticket ใน nav ของ Admin ไม่ใช่เพราะ backend บล็อก
    ```

    **Partner's response:**
    ```
    I'm ready for the merge.
    ```

### PR #56: fix/lab4-project-link-fallback
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/56
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/55
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน — PR นี้แก้แค่ไฟล์ .github/workflows/project-status.yml ไม่มีการแก้โค้ดแอปเลย เทสต์/tsc/E2E จึงไม่ถูกกระทบ (ตรวจ diff แล้วมีแค่ไฟล์ workflow ไฟล์เดียว)
    - [x] ตรวจตรรกะ parser จริงด้วยการรัน bash เคสต่าง ๆ ตามที่ PR อ้างไว้ทุกข้อ: จับคำว่า closes/fixes/resolved ได้ (ตัวใหญ่เล็กและมี colon ก็จับได้), กรอง code span กับ fenced code block ออกได้ถูกต้องไม่จับเลขในนั้น, คำที่แค่ลงท้ายด้วยคีย์เวิร์ดอย่าง "prefixes" ไม่ถูกจับผิด, ตัดเลขซ้ำได้
    - [x] ลองเช็คกับ repo จริงว่าเลขที่เป็น PR ถูกข้ามจริง (#54 เป็น PR → has pull_request = true ถูกกรองออก, #55 เป็น issue → false ถูกเก็บไว้) ตรงตามที่อธิบาย
    - [x] ส่ง PR_BODY ผ่าน env ไม่ใช้ inline ${{ }} ในสคริปต์ ป้องกัน shell injection จากข้อความ PR ได้จริงตามที่บอก
    - [x] ตรวจ YAML ด้วย js-yaml แล้ว parse ผ่าน ไม่มี syntax error
    ```

    **Partner's response:**
    ```
    Thanks. Feel free to merge.
    ```

### PR #57: feature/lab4-final-hardening
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/57
- **Issue** *(no linked Issue)*
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] TypeScript ทั้งฝั่ง Server และ Client ไม่มี error
    - [x] Vitest ทั้งฝั่ง Server (132 เทสต์) และ Client (90 เทสต์) ผ่านครบ 100%
    - [x] เพิ่มชุดทดสอบ Playwright E2E ของ Lab 4 ครบทั้ง 4 ไฟล์ (actions-taken-flow, ticket-resolution, dashboards, hardening) รองรับทั้ง Desktop, Tablet และ Mobile
    - [x] แก้ไขบั๊ก UI และ Accessibility ตามที่ระบุไว้ครบ (ปุ่มบนมือถือสูงเกิน 44px, Focus Ring สีเขียว Zen Green, มี Spinner ตอนกดส่ง, และใส่ Aria Attributes บน Dialog)
    - [x] ปรับแก้ชุดทดสอบ E2E เดิมของ Lab 2 และ Lab 3 ให้ล็อกอินผ่านหน้าเว็บจริงและรองรับ Resolution Gate ทำให้ Regression ผ่านหมด
    - [x] เอกสาร tests.md และ README.md อัปเดตครบ ทั้งตาราง Evidence Map (Part 5-9), รายการภาพแคปหน้าจอหลักฐาน 81 รูป และวิธีรัน E2E
    ```

    **Partner's response:**
    ```
    @RBKarnz Please merge if you feel like it
    ```
