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
| #68 | feature/lab4-doc | Not yet reviewed |

### Reviewer comments I received

### PR #52: feature/lab4-specs
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/52
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/53
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/52#discussion_r4110261001
    ```
    [docs/lab-04/ui-spec.md:75]
    ### IT Staff Dashboard Quick Actions: Missing "Search Tickets" Link
    - **Labsheet Reference:** Section 8.1 (Page 5 screenshot of IT Staff Dashboard).
    - **Current State:**
      - The wireframe screenshot on Page 5 shows three Quick Actions:
        1. `+ Create Ticket`
        2. `Search Tickets`
        3. `My Queue`
      - In `ui-spec.md` Section 4.1, Quick Actions only lists:
        - `Open Ticket Queue` -> navigates to `/staff/queue`
        - `My Tickets Queue` -> navigates to `/staff/queue?ownerId=me&statusGroup=open`
      - While excluding `+ Create Ticket` for IT Staff is documented under Decision D9 (preserving role separation from Labs 2–3), **"Search Tickets"** was omitted from the Quick Actions list.
    - **Impact:** Missing affordance that is prominently shown in the wireframe.
    - **Required Change:** Add `Search Tickets -> navigates to /staff/queue` (with auto-focus on the search bar) to the Quick Actions list in `ui-spec.md`.
    ```

    **Comment 2** — https://github.com/RBKarnz/TokTickIT/pull/52#discussion_r4110265117
    ```
    [docs/lab-04/api-spec.md:346]
    ### Missing `ownership=unassigned` in API Specification Section 6.1
    - **Labsheet Reference:** Section 4.6 & Section 6.2 (IT Staff Dashboard: unassigned tickets metric and drill-down).
    - **Current State:**
      - In `specification.md` and `api-spec.md`, the drill-down link is defined as:
        ```
        /staff/queue?ownership=unassigned&statusGroup=open
        ```
      - In the server codebase (`server/src/app.ts`), `ownership` is validated with allowed values `['assigned', 'unassigned']`.
      - However, in `api-spec.md` Section 6.1 (List Filters for Drill-down), the parameter `ownership` is omitted from the documented list; only `ownerId: me | <int>` is listed.
    - **Impact:** Inconsistency within `api-spec.md` where the response payload specifies `ownership=unassigned`, but the query parameter definition section does not document it.
    - **Required Change:** Add `ownership: assigned | unassigned` to `api-spec.md` Section 6.1.
    ```

    **Comment 3** — https://github.com/RBKarnz/TokTickIT/pull/52#pullrequestreview-5324676882
    ```
    ## Recommended Actions

    To ensure complete alignment and consistency across all documentation:

    1. **Update `docs/lab-04/api-spec.md`:**
       - Document `ownership=assigned|unassigned` under Section 6.1.
    2. **Update `docs/lab-04/ui-spec.md`:**
       - Add `Search Tickets -> /staff/queue` to IT Staff Dashboard Quick Actions.
    3. **Update `docs/lab-04/specification.md`:**
       - Add a brief note under Section 11 (Assumptions and Decisions) clarifying the alignment of Requester Dashboard Card 2 with Handout Section 4.6 and Rubric Part 8 ("attention-required Tickets").

    ---

    ### Requester Dashboard: Wireframe Card 2 ("In Progress") vs. Handout Text ("Waiting for Requester")
    - **Labsheet Reference:**
      - Section 4.6: *"Requester dashboard: total open Tickets, **Tickets waiting for the Requester**, recently updated Tickets, and recently resolved Tickets"*
      - Section 14 (Rubric Part 8): *"Demonstrate Requester-owned metrics, recent and **attention-required Tickets**, drill-down..."*
      - Section 8.2 (Page 6 Wireframe Screenshot): Shows Card 2 labeled **"In Progress (2)"** instead of "Waiting for Requester".
    - **Current State:**
      - Our specification adheres to Section 4.6 and Rubric Part 8 by using `waitingForMe` ("Waiting for Me", status `WAITING_FOR_REQUESTER`), which fulfills the rubric's "attention-required Tickets" criterion.
      - However, neither `specification.md` nor `ui-spec.md` notes this intentional resolution of the wireframe conflict in Section 11 (Assumptions and Decisions).
    - **Impact:** Potential confusion during grading when comparing the wireframe screenshot to the actual card layout.
    - **Required Change:** Document in `specification.md` Section 11 (Assumptions and Decisions) why `waitingForMe` was prioritized over the wireframe's "In Progress" label, citing Section 4.6 and Rubric Part 8.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/52#issuecomment-5846047785
    ```
    Updated! Mind doing a quick re-review when you have time?
    ```

    **Comment 4** — https://github.com/RBKarnz/TokTickIT/pull/52#pullrequestreview-5325864975
    ```
    Everything aligns with the Lab 4 labsheet now.
    All feedback has been properly addressed.

    Tell me if you're ready for the merge.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/52#issuecomment-5846187076
    ```
    Good to go from my side, please proceed with the merge.
    ```

### PR #61: feature/lab4-lab3-tech-debt
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/61
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/54
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/61#pullrequestreview-5330555005
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

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/61#issuecomment-5856549956
    ```
    Thanks a lot for the thorough review and feedback! Feel free to merge.
    ```

### PR #62: feature/lab4-data-foundation
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/62
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/55
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/62#pullrequestreview-5334526559
    ```
    All required database changes are implemented strictly additively in a single migration, preserving all Lab 2–3 data and regression behavior while setting up robust fixtures for subsequent Lab 4 issues.

    Tell me if you're ready for the merge.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/62#issuecomment-5875023777
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #63: feature/lab4-actions-taken-api
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/63
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/56
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/63#pullrequestreview-5388033607
    ```
    The changes in `feature/lab4-actions-taken-api` have been thoroughly reviewed, cross-referenced with the Lab 4 engineering specifications (`specification.md`, `api-spec.md`, `tests.md`) and labsheet (`SE+Lab+4.pdf`), and manually verified against the live environment.

    Good work.
    Tell me if you're ready for the merge.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/63#issuecomment-5948314514
    ```
    Feel free to merge it if no further changes are needed.
    ```

### PR #64: feature/lab4-actions-taken-ui
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/64
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/57
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/64#pullrequestreview-5402389151
    ```
    Verified against the Lab 4 spec and labsheet Part 6 rubric. All client (77/77) and server (239/239) tests pass, build is clean, and data retention/responsive behaviors are working as expected.

    Tell me if you're ready to merge.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/64#issuecomment-5972704733
    ```
    Everything looks good to go. Could you please help merge this PR?
    ```

### PR #65: feature/lab4-ticket-workflow
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/65
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/58
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/65#pullrequestreview-5671837444
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

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/65#issuecomment-6449745477
    ```
    Currently working on the requested updates.
    ```

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/65#issuecomment-6449856539
    ```
    Updated! I've addressed all the requested changes. Please take a quick re-review, and if everything looks good, feel free to merge!
    ```

### PR #66: feature/lab4-dashboards
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/66
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/59
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/66#pullrequestreview-5678896700
    ````
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
    ````

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/66#issuecomment-6463431866
    ```
    Feel free to merge if everything look good.
    ```

    **Comment 2** — https://github.com/RBKarnz/TokTickIT/pull/66#pullrequestreview-5679115044
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

### PR #67: feature/lab4-hardening
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/67
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/60
- **Comment:**
 **Reviewer comment I received:**
    **Comment 1** — https://github.com/RBKarnz/TokTickIT/pull/67#pullrequestreview-5680192025
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

    **How I responded:** — https://github.com/RBKarnz/TokTickIT/pull/67#issuecomment-6465617493
    ```
    Good to go on my end. Press the merge button please!
    ```

    **Comment 2** — https://github.com/RBKarnz/TokTickIT/pull/67#pullrequestreview-5680445775
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

### PR #68: feature/lab4-doc
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/68
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/60
- **Comment:**
 **Reviewer comment I received:**
    Not yet reviewed as of this writing.

## Pull Requests I reviewed for my partner

### PR #43: docs/lab4-specs
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/43
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/42
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/43#pullrequestreview-5325681856
    ```
    CHANGES_REQUESTED verdict on specification.md, api-spec.md, ui-spec.md and tests.md as a whole, cross-referenced against SE+Lab+4.pdf — covering metric definitions, dashboard drill-down parameters, UI Quick Actions wording, and resolution-gate wording, in a [x]/[ ] checklist against the labsheet sections.
    ```

    **Partner's response:**
    ```
    On it.

    Please note that the reviewer.md and ai-use.md won't be created for now.
    It'll be done at the very last PR before the merge.
    ```

    **My comment 2** — https://github.com/Bobbie-CPE38/TokTickIT/pull/43#pullrequestreview-5325837516
    ```
    [x] All CHANGES_REQUESTED items from the previous review are resolved
    [x] specification.md, api-spec.md, ui-spec.md and tests.md are internally consistent with each other
    [x] Document matches SE+Lab+4.pdf's required structure and terminology

    Approved.
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
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/49#pullrequestreview-5331951342
    ```
    CHANGES_REQUESTED verdict on the ActionTaken migration, idempotent seed behavior, and the new Actions Taken REST endpoints against api-spec.md and specification.md for Issue #44, with a request to update the testing instructions in the PR description to match what the branch actually implements.
    ```

    **Partner's response:**
    ```
    I've updated testing instruction accordingly.

     Can you please check it out?
    ```

    **My comment 2** — https://github.com/Bobbie-CPE38/TokTickIT/pull/49#pullrequestreview-5353106338
    ```
    [x] Migration is additive and preserves Lab 1–3 data
    [x] Seed is repeat-safe (idempotent) for Actions Taken fixtures
    [x] REST endpoints match api-spec.md authorization and payload shape
    [x] Updated testing instructions in the PR description match what was actually run

    Approved.
    ```

    **Partner's response:**
    ```
    Please proceed to merge if you feel like it.
    ```

### PR #50: feature/lab4-actions-taken-ui
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/50
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/45
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/50#pullrequestreview-5389984068
    ```
    CHANGES_REQUESTED verdict on the Actions Taken list/create/edit modes on Ticket Detail against ui-spec.md and tests.md, covering mode transitions and component test coverage for each mode.
    ```

    **Partner's response:**
    ```
    Roger! Working on it.
    ```

    **My comment 2** — https://github.com/Bobbie-CPE38/TokTickIT/pull/50#pullrequestreview-5393604532
    ```
    [x] List, create and edit modes match ui-spec.md
    [x] Component tests cover all three modes
    [x] Responsive behavior holds at desktop, tablet and mobile widths

    Approved.
    ```

    **Partner's response:**
    ```
    Thanks. I'm ready for the merge.
    ```

### PR #51: feature/lab4-ticket-workflow
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/51
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/46
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/51#pullrequestreview-5446432612
    ```
    CHANGES_REQUESTED verdict on the status transition matrix, Resolution Gate conditions, and the optimistic-concurrency version check against specification.md and api-spec.md for Issue #46.
    ```

    **My comment 2** — https://github.com/Bobbie-CPE38/TokTickIT/pull/51#pullrequestreview-5678831827
    ```
    [x] Status transition matrix matches specification.md
    [x] Resolution Gate enforces resolution summary, completed Action Taken and no open follow-up
    [x] Optimistic concurrency returns 409 on a stale version
    [x] History rows are append-only and ordered correctly

    Approved.
    ```

    **Partner's response:** — https://github.com/Bobbie-CPE38/TokTickIT/pull/51#issuecomment-6462674752
    ```
    Thanks.

    Feel free to merge.
    ```

    Note: Comment 1 (2026-10-07) and Comment 2 (2026-10-28) are three weeks apart — that gap spans a weekly usage-limit pause in this session, not a delay on the partner's side.

### PR #52: feature/lab4-project-automation
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/52
- **Issue** None — CI/project-automation PR, not tied to a Lab 4 Issue.
- **Comment:**
 No reviews or comments were exchanged on this PR; it was a CI/workflow-only change (`.github/workflows` project-status automation).

### PR #53: docs/lab4-agents-board-workflow
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/53
- **Issue** None — docs-only PR documenting board automation and PR-linking rules, not tied to a Lab 4 Issue.
- **Comment:**
 No reviews or comments were exchanged on this PR.

### PR #54: feature/lab4-role-dashboards
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/54
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/47
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/54#pullrequestreview-5679835880
    ```
    [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน (server 132/132, client 90/90, tsc ทั้งสองฝั่งไม่มี error, e2e/lab-04/dashboards.spec.ts 9/9 ผ่านทั้ง desktop/tablet/mobile)
    [x] แยกสิทธิ์ตาม role ถูกต้องจริง ลองยิง API ตรงพบว่า /api/dashboards/requester คืนข้อมูลเฉพาะของ requester คนนั้น (scoped ด้วย requesterId) ยิง /api/dashboards/staff ด้วย token requester ได้ 403 ตามที่ควร
    [x] filter=open บน GET /api/tickets ทำงานถูก ส่วน filter อื่นที่ไม่รู้จักได้ 400 ตามที่อธิบายไว้
    [x] Trend delta คำนวณจาก baseline เที่ยงคืน UTC ตรงตามที่เขียนไว้ใน BR-15 ตรวจโค้ด getUtcDayStart และ calculateTrendDelta แล้วตรงกัน
    [x] Guardrails ผ่าน app.ts 35 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features
    [x] Login ยัง landing ที่ /queue, /tickets, /admin/users ตามเดิม ส่วน /dashboard เป็น route แยกไม่กระทบ regression ตรวจโค้ด RouteGuard แล้วตรงกับ Decision 1 ที่อธิบายไว้
    [ ] คำอธิบาย PR เขียนว่า "including all 43 Lab 2 tests unmodified" แต่รันจริงนับได้ 41 เทสต์ใน server/tests/lab-02/ (ผ่านหมด) ตัวเลขผิดเหมือนที่เคยแจ้งใน PR #51 ควรแก้ให้ตรง
    [ ] Decision 4 บอกว่า Admin dashboard ไม่มีปุ่ม Create Ticket เพราะ "admins get 403 on POST /api/tickets" แต่ลองยิง API ตรงด้วย token admin ได้ 201 สร้างตั๋วสำเร็จ และโค้ด client ที่ RouteGuard.tsx ก็อนุญาตให้ ADMINISTRATOR เข้าถึง view "create-ticket" ด้วย (ไม่ได้บล็อก) เท่ากับว่า Admin เข้า URL /tickets/new ตรง ๆ แล้วสร้างตั๋วได้จริง ไม่ตรงกับเหตุผลที่ให้ไว้ ควรแก้คำอธิบายให้ตรงกับของจริง หรือถ้าตั้งใจจะบล็อก Admin จริง ๆ ต้องเพิ่ม role check ที่ backend route และ RouteGuard ด้วย
    ```

    **Partner's response:** — https://github.com/Bobbie-CPE38/TokTickIT/pull/54#issuecomment-6464507472
    ```
    Thanks for the review. Both points are fixed.

    **1. Lab 2 test count:** confirmed, `server/tests/lab-02/` has 41 tests. I changed 43 to 41 in the PR description. `AGENTS.md` and `tests.md` (API-23) still say 43, but that's outside this PR; I'll raise it in final hardening.

    **2. Admin and Create Ticket:** confirmed. `POST /api/tickets` has no role check, so an admin gets 201, and `RouteGuard` allows `/tickets/new`. My original reason was wrong. I chose to correct the explanation rather than block admins, because changing who can create tickets belongs to the tickets feature, not this dashboards issue.
    - Fixed the comment in `AdminDashboard.tsx` (commit `fix(dashboards): correct admin Create Ticket rationale comment`). The real reason is that each role's quick actions mirror its nav in ui-spec §4.1, and the Administrator nav has only Dashboard and Admin.
    - Updated the decision in the PR description. It now notes that the code disagrees with api-spec §1.2, which says admins should get 403, and leaves final hardening to decide whether to enforce the spec or change it.

    After the fix, Lab 4 client tests pass 25/25 and `tsc` reports no errors.
    ```

    **My comment 2** — https://github.com/Bobbie-CPE38/TokTickIT/pull/54#pullrequestreview-5679976238
    ```
    [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน (server 132/132, client 90/90, tsc ทั้งสองฝั่งไม่มี error, e2e/lab-04/dashboards.spec.ts 9/9 ผ่านทั้ง desktop/tablet/mobile)
    [x] แยกสิทธิ์ตาม role ถูกต้องจริง ลองยิง API ตรงพบว่า /api/dashboards/requester คืนข้อมูลเฉพาะของ requester คนนั้น (scoped ด้วย requesterId) ยิง /api/dashboards/staff ด้วย token requester ได้ 403 ตามที่ควร
    [x] filter=open บน GET /api/tickets ทำงานถูก ส่วน filter อื่นที่ไม่รู้จักได้ 400 ตามที่อธิบายไว้
    [x] Trend delta คำนวณจาก baseline เที่ยงคืน UTC ตรงตามที่เขียนไว้ใน BR-15 ตรวจโค้ด getUtcDayStart และ calculateTrendDelta แล้วตรงกัน
    [x] Guardrails ผ่าน app.ts 35 บรรทัด App.tsx 19 บรรทัด core ไม่มี import จาก features
    [x] Login ยัง landing ที่ /queue, /tickets, /admin/users ตามเดิม ส่วน /dashboard เป็น route แยกไม่กระทบ regression ตรวจโค้ด RouteGuard แล้วตรงกับ Decision 1 ที่อธิบายไว้
    [x] จำนวนเทสต์ Lab 2 — แก้คำอธิบาย PR จาก "43 Lab 2 tests" เป็น "41 Lab 2 tests in server/tests/lab-02/" ให้ตรงกับที่รันได้จริงแล้ว (ตรวจซ้ำแล้วนับได้ 41 จริง)
    [x] คำอธิบายเรื่อง Admin สร้างตั๋วได้ — แก้ Decision 4 ในคำอธิบาย PR ยอมรับตรงๆ ว่าที่เขียนไว้ก่อนหน้าว่า "admin ได้ 403 ตอน POST /api/tickets" นั้นผิด เพราะ route ไม่มี role check จริง (admin ยิงแล้วได้ 201) และ RouteGuard ก็ยังให้ ADMINISTRATOR เปิด /tickets/new ได้ พร้อมอธิบายว่า api-spec กำหนดให้ Admin ต้องถูกบล็อก (403) แต่โค้ดกับสเปกยังขัดกันอยู่ และตั้งใจแยกเรื่องนี้ไปแก้ใน final-hardening แทน ไม่ใช่สโคปของ PR นี้ ส่วนในแดชบอร์ดก็แก้คอมเมนต์ในโค้ด AdminDashboard.tsx ให้บอกเหตุผลที่ถูกต้องว่าเพราะ ui-spec §4.1 ไม่มีปุ่ม Create Ticket ใน nav ของ Admin ไม่ใช่เพราะ backend บล็อก
    ```

    **Partner's response:** — https://github.com/Bobbie-CPE38/TokTickIT/pull/54#issuecomment-6464683378
    ```
    I'm ready for the merge.
    ```

### PR #56: fix/lab4-project-link-fallback
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/56
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/55
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/56#pullrequestreview-5679832124
    ```
    [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ Playwright E2E suites ผ่านครบถ้วน — PR นี้แก้แค่ไฟล์ .github/workflows/project-status.yml ไม่มีการแก้โค้ดแอปเลย เทสต์/tsc/E2E จึงไม่ถูกกระทบ (ตรวจ diff แล้วมีแค่ไฟล์ workflow ไฟล์เดียว)
    [x] ตรวจตรรกะ parser จริงด้วยการรัน bash เคสต่าง ๆ ตามที่ PR อ้างไว้ทุกข้อ: จับคำว่า closes/fixes/resolved ได้ (ตัวใหญ่เล็กและมี colon ก็จับได้), กรอง code span กับ fenced code block ออกได้ถูกต้องไม่จับเลขในนั้น, คำที่แค่ลงท้ายด้วยคีย์เวิร์ดอย่าง "prefixes" ไม่ถูกจับผิด, ตัดเลขซ้ำได้
    [x] ลองเช็คกับ repo จริงว่าเลขที่เป็น PR ถูกข้ามจริง (#54 เป็น PR → has pull_request = true ถูกกรองออก, #55 เป็น issue → false ถูกเก็บไว้) ตรงตามที่อธิบาย
    [x] ส่ง PR_BODY ผ่าน env ไม่ใช้ inline ${{ }} ในสคริปต์ ป้องกัน shell injection จากข้อความ PR ได้จริงตามที่บอก
    [x] ตรวจ YAML ด้วย js-yaml แล้ว parse ผ่าน ไม่มี syntax error
    ```

    **Partner's response:** — https://github.com/Bobbie-CPE38/TokTickIT/pull/56#issuecomment-6464451092
    ```
    Thanks. Feel free to merge.
    ```

### PR #57: feature/lab4-final-hardening
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/57
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/48
- **Comment:**
 **My comment 1** — https://github.com/Bobbie-CPE38/TokTickIT/pull/57#pullrequestreview-5682994677
    ```
    [x] TypeScript ทั้งฝั่ง Server และ Client ไม่มี error
    [x] Vitest ทั้งฝั่ง Server (132 เทสต์) และ Client (90 เทสต์) ผ่านครบ 100%
    [x] เพิ่มชุดทดสอบ Playwright E2E ของ Lab 4 ครบทั้ง 4 ไฟล์ (actions-taken-flow, ticket-resolution, dashboards, hardening) รองรับทั้ง Desktop, Tablet และ Mobile
    [x] แก้ไขบั๊ก UI และ Accessibility ตามที่ระบุไว้ครบ (ปุ่มบนมือถือสูงเกิน 44px, Focus Ring สีเขียว Zen Green, มี Spinner ตอนกดส่ง, และใส่ Aria Attributes บน Dialog)
    [x] ปรับแก้ชุดทดสอบ E2E เดิมของ Lab 2 และ Lab 3 ให้ล็อกอินผ่านหน้าเว็บจริงและรองรับ Resolution Gate ทำให้ Regression ผ่านหมด
    [x] เอกสาร tests.md และ README.md อัปเดตครบ ทั้งตาราง Evidence Map (Part 5-9), รายการภาพแคปหน้าจอหลักฐาน 81 รูป และวิธีรัน E2E
    ```

    **Partner's response:** — https://github.com/Bobbie-CPE38/TokTickIT/pull/57#issuecomment-6471286659
    ```
    @RBKarnz Please merge if you feel like it
    ```
