# Lab 3 — Peer Review Record

**Author:** <ธีรกาญจน์ น้อยรักษา> — <67070501062> — GitHub: @<RBKarnz>
**Peer reviewer:** <เมธิภัทร มั่นทรัพย์> — <67070501071> — GitHub: @<Bobbie-CPE38>

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #41 | feature/lab3-specs | Approved |
| #42 | feature/lab3-db-migration | Approved |
| #43 | feature/lab3-db-migration | Approved |
| #44 | feature/lab3-auth | Approved |
| #45 | feature/lab3-requester-comments | Approved |
| #46 | feature/lab3-staff-queue | Approved |
| #47 | feature/lab3-staff-operations | Approved |
| #48 | feature/lab3-admin-user-management | Approved |
| #49 | feature/lab3-release-integration | Approved |
| #50 | lab3-staging (release to main) | Approved |

### Reviewer comments I received

### PR #41: feature/lab3-specs
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/41
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/32
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    [docs/lab-03/api-spec.md]
    ### `docs/lab-03/api-spec.md` (`api-spec`)

    #### Covered
    - **API Conventions & Security (§ 1, § 10, § 11)**: Base path `/api`, `HttpOnly` cookie session management, idle/absolute timeouts, generic safe error schemas, parameterized database access.
    - **Authentication Endpoints (§ 3)**: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` with safe, non-enumerating error responses.
    - **Requester Endpoints (§ 4)**: Authenticated `POST /tickets`, `GET /tickets`, `GET /tickets/:ticketId`, and `POST /tickets/:ticketId/problem-appears-resolved`.
    - **IT Staff Operational Endpoints (§ 5–7)**: `GET /staff/tickets` (with pagination, search, status, priority, ownership filters), `GET /staff/tickets/:ticketId`, `POST /claim`, `PUT /owner`, `PATCH /it-priority`, `POST /status`.
    - **Administrator Endpoints (§ 8)**: `GET /admin/users` (with search and role filter), `POST /admin/users`, `PATCH /admin/users/:userId`, `POST /admin/users/:userId/set-initial-password`.
    - **Safe Error Mapping Table (§ 9)**: Maps unauthenticated (401), forbidden (403), non-disclosure of protected resources (404), and conflicts (409).

    #### Missing
    - **`Resolution Summary` in Ticket Detail & Status APIs**:
      - *Source*: § 8.4 (UI Mockup p. 10).
      - *Finding*: `Resolution Summary` is not returned in `GET /staff/tickets/:ticketId` and cannot be submitted via `POST /staff/tickets/:ticketId/status` or `PATCH`.

    #### Incomplete
    - **`POST /auth/change-password` Request Schema**:
      - *Source*: § 8.1 (UI Mockup p. 8).
      - *Finding*: The request payload takes only `{ newPassword, confirmPassword }`. It omits **`currentPassword`**, which is explicitly illustrated as the first required input on the Page 8 mockup ("Current (temporary) password").
    - **Queue Query Sorting (`sortBy`)**:
      - *Source*: § 6.3 and § 8.3 (UI Mockup p. 9).
      - *Finding*: The Page 9 table mockup displays sort indicators on `Category ↕` and `Owner ↕`. `api-spec.md` line 298 omits both `category` and `owner` from the supported `sortBy` enum values.
    - **IT Staff Attachment Authorization**:
      - *Source*: § 4.3, § 6, § 8.4.
      - *Finding*: `api-spec.md` line 209 states that existing attachment endpoints preserve Lab 2 semantics. In Lab 2, all attachment endpoints returned `403 Forbidden` if the caller was not the Requester owner. The specification fails to define authorization allowing IT Staff to download or view attachments on tickets in the staff queue.
    - **Admin User Role Modification Safety**:
      - *Source*: § 4.4 and § 8.5.
      - *Finding*: `PATCH /admin/users/:userId` accepts `role`, but does not specify returning a `409 Conflict` if the patch attempts to change the role of the last active Administrator.

    #### Incorrect / Contradictory
    - **Internal Notes Authorization Conflict**:
      - *Source*: § 4.4 (BR-04) and § 4.6.
      - *Finding*: `POST /staff/tickets/:ticketId/internal-notes` line 433 specifies `Role: IT Staff only`, completely denying Administrators despite the labsheet explicitly stating Internal Notes are visible to IT Staff and Administrators.
    ```

    **Comment 2**
    ```
    [docs/lab-03/specification.md]
    ### `docs/lab-03/specification.md` (`spec`)

    #### Covered
    - **Sprint Goal, Stakeholder Request, Scope & Exclusions (§ 1–3)**: Fully reflects Lab 3 goals and all excluded items (no MFA, SSO, user deletion, bulk ops, SLA, Actions Taken, etc.).
    - **Functional Requirements (§ 5)**: Numbered statements FR-01 through FR-38 cover authentication, server-side authorization, Requester ticket operations, IT Staff workflows, Administrator user management, and append-only comments/notes.
    - **Approved Ticket Status Matrix (§ 6)**: Implements all 8 required statuses (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`) with explicit transition rules and UI confirmation requirements.
    - **Data Model Increment (§ 8)**: Defines User, Session, PublicComment, InternalNote, and additive Ticket fields (`ownerId`, `itPriority`, `requesterResolvedAt`).
    - **Product Definition of Done (§ 14)**: Establishes complete quality checklist for implementation.

    #### Missing
    - **`Resolution Summary` Data Model Field**:
      - *Labsheet Source*: § 8.4 (UI Mockup p. 10).
      - *Finding*: The mockup prominently displays an operational field: *"Resolution Summary: Add resolution summary (visible to requester)..."*. `specification.md` § 8 ("Ticket additive fields") completely omits this field.
    - **Initial Password Migration Procedure for Requesters**:
      - *Source*: § 5.2 (*"Students must document and test how existing Requesters receive initial passwords, and how the temporary selector and its client-side state are removed"*).
      - *Finding*: `specification.md` § 9 (Step 7) merely states *"according to the documented local migration procedure"*, but no such procedure, formula, or default credential is documented anywhere in the specification.
    - **Documented Seed Development Credentials**:
      - *Source*: § 5.3 and § 6 (*"Seeded credentials are for local development only and must be clearly documented"*).
      - *Finding*: `specification.md` § 10 lists required account quotas (e.g., 4 active / 1 inactive Requester), but does not document the actual seed account directory, emails, or development passwords.

    #### Incomplete
    - **UI Specification Summary (§ 12)**:
      - *Source*: § 9 (Required Sections Table p. 13).
      - *Finding*: Handout § 9 mandates *"Screen structure, modes, controls, feedback, role behavior, responsive rules, and reference to ui-spec.md"*. Section 12 contains only an 11-line list of screen names and a reference link, completely omitting the required summary of screen structure, modes, controls, and responsive behavior.
    - **Admin Safety Rule Against Role Demotion**:
      - *Source*: § 4.4 and § 8.5 (*"preventing removal or deactivation of the last active Administrator"*).
      - *Finding*: BR-50 and BR-51 only prohibit *deactivating* the last active Administrator (`isActive=false`). They fail to explicitly prevent **demoting or changing the role** of the last active Administrator to `REQUESTER` or `IT_STAFF`.
    - **IT Staff Attachment Authorization in Auth Matrix (§ 7)**:
      - *Source*: § 4.3, § 8.4, § 14 Part 7.
      - *Finding*: The Authorization Matrix has no entry for Attachments, leaving IT Staff permissions to view or download attachments on tickets in their workflow undefined.

    #### Incorrect / Contradictory
    - **Internal Notes Visibility Contradiction**:
      - *Source*: § 4.4 (BR-04) and § 4.6 (*"Internal Notes are operational notes visible only to IT Staff and Administrator"*).
      - *Finding*: In `specification.md`, FR-38 and BR-40 state Internal Notes are visible to IT Staff and Administrator. However, **Assumption 5 (line 378) explicitly contradicts this by stating *"Internal Notes: IT Staff only. This is the authorization-matrix decision for this specification"*, and AC-14 states *"Internal Notes are readable only by IT Staff"***.
    - **Mandatory Business Rule Numbering Mismatch**:
      - *Source*: § 4.4 (Table p. 4).
      - *Finding*: The labsheet establishes BR-01 through BR-05 as mandatory example rules (BR-04 = Comments & Notes visibility; BR-05 = Requester resolution indication). `specification.md` renumbered BR-04 to inactive user login and BR-05 to login error non-enumeration, shifting the actual rules to BR-39/BR-40 and BR-22/BR-35.
    - **Acceptance Criteria Numbering Mismatch**:
      - *Source*: § 9.1 and § 10 (Table p. 14).
      - *Finding*: Labsheet defines AC-03 as requesterId spoofing prevention and AC-04 as Requester internal note rejection. `specification.md` redefined AC-03 and AC-04 as invalid credentials and logout, shifting labsheet AC-03 to AC-06 and AC-04 to AC-07/AC-14.
    - **Password Policy Complexity Conflict**:
      - *Source*: § 8.1 (UI Mockup p. 8).
      - *Finding*: The Page 8 mockup explicitly depicts live validation: *"- Be at least 8 characters / - Include upper and lower case letters / - Include a number and a special character"*. BR-13 defines a length-only policy of *12–128 Unicode characters* with no complexity requirements.
    ```

    **Comment 3**
    ```
    [docs/lab-03/tests.md]
    ### `docs/lab-03/tests.md` (`tests`)

    #### Covered
    - **Test Strategy & Constraints (§ 1)**: Prohibits mocking production persistence, hardcoded responses, and UI-only assertions for security.
    - **Coverage Types (§ 3–9)**: Outlines API/integration, Unit, UI component, UI style/responsive, E2E, and regression test suites.
    - **Acceptance Criteria Traceability Matrix (§ 11)**: Maps AC identifiers to planned test IDs.
    - **Concurrency & Transaction Tests (§ 3)**: Covers stale-state status conflicts (API-65) and atomic last-admin enforcement (API-66).

    #### Missing
    - **Mandatory Table Columns (`Automated Test File` and `Final`)**:
      - *Source*: § 10 (Table p. 14) and § 14 Part 3.
      - *Finding*: The labsheet explicitly requires a 7-column table: `Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final`. In `tests.md`, **`Automated Test File` and `Final` columns are missing** from API and Unit test tables. Sections 5–8 (UI, Style, E2E, Security) are bulleted lists without test file paths or final status.
    - **CSRF Defense Automated Tests**:
      - *Source*: § 6.1, `specification.md` Assumption 2 (*"must be documented in code and tested"*), and `api-spec.md` § 1.
      - *Finding*: There are no unit, API, or security test cases verifying CSRF token validation or origin validation.

    #### Incomplete
    - **Client Test Directory Path (§ 2)**:
      - *Source*: § 12 and § 16.
      - *Finding*: Line 28 retains the handout's literal placeholder `client/.../lab-03 tests/` instead of specifying the actual workspace path `client/tests/lab-03/`.
    - **Documented Test Fixture Credentials (§ 10)**:
      - *Source*: § 5.3 and § 6.
      - *Finding*: Section 10 mentions that credentials are not real personal passwords, but fails to document the test/seed user credentials needed to run the test suite.
    - **Admin Role Demotion Test**:
      - *Source*: § 10 (p. 15).
      - *Finding*: API-56 and UNIT-16 test deactivating the last active Admin, but no test verifies rejection when attempting to change the role of the last active Admin.

    #### Incorrect / Contradictory
    - **Traceability Clash with Handout Example Row (`API-08` / `AC-04`)**:
      - *Source*: § 10 (Table p. 14).
      - *Finding*: The labsheet table explicitly designates `API-08` as testing `AC-04` (*"Requester requests Internal Notes | Forbidden; no note data returned | server/tests/lab-03/notes.api.test.ts | Pass"*). In `tests.md` line 53, `API-08` is assigned to `AC-02` (*"Successful first-login password change"*).
    - **Internal Notes Authorization Rule**:
      - *Source*: § 4.4 (BR-04) and § 4.6.
      - *Finding*: UNIT-08 defines *"Staff-only rule: Requester/Admin denied for Staff-only operation"*, which incorrectly excludes Administrators from viewing notes.
    - **Password Policy Boundary Tests**:
      - *Source*: § 8.1 (UI Mockup p. 8).
      - *Finding*: UNIT-01 tests 11 rejected / 12 accepted based on the 12–128 character rule, which conflicts with the mockup's 8+ char and complexity rules.
    ```

    **Comment 4**
    ```
    [docs/lab-03/ui-spec.md]
    ### `docs/lab-03/ui-spec.md` (`ui-spec`)

    #### Covered
    - **Design System & Shell (§ 1–2)**: Reuses Zen Green tokens, header showing authenticated user name and role badge, logout action, role-specific navigation hiding unauthorized links.
    - **Login Screen (§ 3)**: Idle, busy, validation, safe error states, routing for standard vs first-login users.
    - **Mandatory Change Password Screen (§ 4)**: First-login modal/page blocking normal app access until saved.
    - **IT Staff Ticket Queue (§ 6)**: Responsive table on desktop, stacked cards on mobile, search, status filters (all 8 statuses), pagination with zero-page handling (`totalPages=0`), status/priority/owner badges.
    - **IT Staff Ticket Detail (§ 7)**: Grouped ticket information, ownership claim/reassign controls, IT priority editing, permitted status transitions, visual distinction between Public Comments and Internal Notes.
    - **Administrator User Management (§ 8)**: Single minimalist screen, user list columns (Name, Email, Role, Status, Edit), search, single role filter, create/edit drawer, self-deactivation prevention, last active Admin safety feedback.
    - **Responsive & Accessibility Checklist (§ 9)**: Covers keyboard navigation, visible focus, aria labels, no color-only indicators, no horizontal overflow.

    #### Missing
    - **Password Reveal Toggle ("Eye" Icon)**:
      - *Source*: § 8.1 (UI Mockups p. 8).
      - *Finding*: All password fields in the Login and Change Password mockups display eye toggle icons. `ui-spec.md` § 3 and § 4 omit password reveal behavior.
    - **`Resolution Summary` Input on Ticket Detail**:
      - *Source*: § 8.4 (UI Mockup p. 10).
      - *Finding*: The mockup features a `Resolution Summary` input (*"Add resolution summary (visible to requester)..."*). This is completely missing from `ui-spec.md` § 7.

    #### Incomplete
    - **Change Password "Current Password" Input Control**:
      - *Source*: § 8.1 (UI Mockup p. 8).
      - *Finding*: Page 8 mockup shows "Current (temporary) password". `ui-spec.md` line 93 makes it conditional (*"only if the backend requires it"*), leaving the control uncommitted.
    - **Ticket Detail Navigation Controls**:
      - *Source*: § 8.4 (UI Mockup p. 10).
      - *Finding*: Page 10 mockup shows breadcrumb navigation (`My Queue > Ticket Detail`) and a `<- Back to Queue` button, which are omitted from `ui-spec.md` § 7.
    - **Queue Table Sort Indicators**:
      - *Source*: § 6.3 and § 8.3 (UI Mockup p. 9).
      - *Finding*: Page 9 mockup displays sort arrows on `Category ↕` and `Owner ↕`, but `ui-spec.md` line 200 omits both from supported sort columns.
    - **Visual Checklist Template (§ 10)**:
      - *Source*: § 14 Part 9.
      - *Finding*: Section 10 lists items to record, but lacks a structured checklist table for recording evaluation results across desktop, tablet, and mobile widths.

    #### Incorrect / Contradictory
    - **Password Policy Helper Checklist**:
      - *Source*: § 8.1 (UI Mockup p. 8).
      - *Finding*: The Page 8 mockup depicts live validation rules: *"- Be at least 8 characters / - Include upper and lower case letters / - Include a number and a special character"*. `ui-spec.md` § 4 specifies *12–128 Unicode characters* with no complexity rules.
    - **Internal Notes Section Labeling**:
      - *Source*: § 4.4 (BR-04) and § 4.6.
      - *Finding*: Line 295 mandates the label `Internal Notes — IT Staff Only`, which conflicts with the labsheet rule stating Internal Notes are visible to IT Staff and Administrators.
    ```

    **Comment 5**
    ```
    This is table of what's missing from labsheet PDF.

    | # | File | Section | Labsheet Source | Classification | Action Required |
    |---|---|---|---|---|---|
    | 1 | `tests.md` | § 3, § 4, § 5, § 6, § 7 | § 10, § 14 Part 3 | **Missing** | Add `Automated Test File` and `Final` columns to all test tables; format UI/E2E/Security sections into 7-column tables. |
    | 2 | `specification.md`<br>`api-spec.md`<br>`ui-spec.md` | `spec` § 8<br>`api` § 6<br>`ui` § 7 | § 8.4 (mockup p. 10) | **Missing** | Add `resolutionSummary` to Ticket additive fields, API responses/requests (`GET /staff/tickets/:id`, `POST /status`), and UI controls. |
    | 3 | `specification.md` | § 9 (item 7) | § 5.2 | **Missing** | Document the exact initial password provisioning procedure for migrated Requesters. |
    | 4 | `specification.md`<br>`tests.md` | `spec` § 10<br>`tests` § 10 | § 5.3, § 6 | **Missing** | Document the seed development account credentials (emails, roles, default passwords). |
    | 5 | `ui-spec.md` | § 3, § 4 | § 8.1 (mockup p. 8) | **Missing** | Specify password reveal/hide toggle ("eye" icon) controls on Login and Change Password screens. |
    | 6 | `tests.md` | § 3, § 8 | § 6.1, `spec` § 15.2 | **Missing** | Add automated test cases for CSRF token validation and cross-origin state-mutating request rejection. |
    | 7 | `specification.md` | § 12 | § 9 (table p. 13) | **Incomplete** | Expand Section 6 ("UI Specification Summary") to summarize screen structure, modes, controls, feedback, role behavior, and responsive rules. |
    | 8 | `specification.md`<br>`api-spec.md`<br>`tests.md` | `spec` § 6<br>`api` § 8<br>`tests` § 3, § 4 | § 4.4, § 8.5 | **Incomplete** | Explicitly specify and test preventing *role modification/demotion* of the last active Administrator. |
    | 9 | `api-spec.md`<br>`ui-spec.md` | `api` § 3<br>`ui` § 4 | § 8.1 (mockup p. 8) | **Incomplete** | Align Change Password contract to include `currentPassword` in both UI controls and `POST /auth/change-password`. |
    | 10 | `specification.md`<br>`api-spec.md` | `spec` § 7<br>`api` § 4, § 6 | § 4.3, § 8.4 | **Incomplete** | Add Attachments to the Authorization Matrix and define IT Staff authorization to view/download ticket attachments in `api-spec.md`. |
    | 11 | `api-spec.md`<br>`ui-spec.md` | `api` § 5<br>`ui` § 6 | § 6.3, § 8.3 (mockup p. 9) | **Incomplete** | Add `category` and `owner` to supported `sortBy` parameters and queue table sortable columns. |
    | 12 | `ui-spec.md` | § 7 | § 8.4 (mockup p. 10) | **Incomplete** | Add breadcrumb navigation (`My Queue > Ticket Detail`) and `<- Back to Queue` button to IT Staff Ticket Detail. |
    | 13 | `tests.md` | § 2 | § 12 | **Incomplete** | Replace placeholder `client/.../lab-03 tests/` with `client/tests/lab-03/`. |
    | 14 | `ui-spec.md` | § 10 | § 14 Part 9 | **Incomplete** | Add an explicit visual checklist table across desktop, tablet, and mobile viewports. |
    | 15 | `specification.md`<br>`ui-spec.md`<br>`api-spec.md`<br>`tests.md` | `spec` § 5, § 6, § 15<br>`ui` § 7<br>`api` § 7<br>`tests` § 4 | § 4.4 (BR-04), § 4.6 | **Incorrect/Contradictory** | Harmonize Internal Notes visibility: resolve conflict between FR-38/BR-40 (Admin allowed) and AC-14/Assumption 5/UNIT-08 (Admin denied). |
    | 16 | `specification.md`<br>`tests.md` | `spec` § 13<br>`tests` § 3, § 11 | § 9.1, § 10 (p. 14) | **Incorrect/Contradictory** | Realign AC-04 and API-08 to match the labsheet's example table (`API-08` tests `AC-04` for Requester Internal Notes rejection). |
    | 17 | `specification.md` | § 6 | § 4.4 | **Incorrect/Contradictory** | Align mandatory business rules BR-01 through BR-05 with the labsheet's exact definitions. |
    | 18 | `specification.md`<br>`ui-spec.md`<br>`tests.md` | `spec` § 6<br>`ui` § 4<br>`tests` § 4 | § 8.1 (mockup p. 8) | **Incorrect/Contradictory** | Reconcile password policy rules between the Page 8 mockup checklist (8+ chars, upper/lower, number, special char) and the 12–128 character rule. |
    ```

    **How I responded:**
    ```
    Understood! Working on the doc updates now.
    ```

    **Comment 6**
    ```
    Everything aligns with the labsheet now.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Ready to merge Thanks!
    ```

### PR #42: feature/lab3-db-migration
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/42
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/33
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    [server/prisma/migrations/20260913004050_lab3_users_auth/migration.sql]
    # Missing IT Priority Initialization for Existing Tickets in Migration

    - `specification.md` Section 8. "`itPriority` required after migration; initialize from Requested Priority if missing."
    - `specification.md` Section 9 Step 5. "5. Initialize missing IT Priority from Requested Priority."
    - `specification.md` Section 6 BR-29. "IT Priority initially equals Requested Priority when the Ticket is created/migrated if no existing IT Priority exists."
    - `tests.md` Line 261."IT Priority initialized where previously absent;"*

    - In Lab 2, `Ticket.itPriority` was set to `'UNASSIGNED'` by default.
    - In `server/prisma/migrations/20260913004050_lab3_users_auth/migration.sql` there is no SQL statement initializing `itPriority` from `requestedPriority` for existing tickets (e.g., `UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" = 'UNASSIGNED';`).
    - Existing Lab 2 tickets migrated by this migration remain `UNASSIGNED`.
    ```

    **Comment 2**
    ````
    [server/prisma/seed.ts]
    # Seed Data Array Omits New Lab 3 Statuses

    - `specification.md` Section 10. "realistic Tickets distributed across Requesters, statuses, priorities, and assigned/unassigned ownership;"
    - `specification.md` Section 6 BR-31. "Required statuses are exactly: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`."
    - `tests.md` Line 280. "Tickets covering every status, Requested/IT Priority combination needed by transition tests, assigned/unassigned ownership;"*

    - In `server/prisma/seed.ts:L162-164`
        ```ts
        const statuses: Array<"NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "WAITING_FOR_REQUESTER" | "REOPENED" | "CANCELLED"> = [
          "NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED",
        ];
        ```
        While the TypeScript type union includes all Lab 3 statuses, the runtime array only contains the 5 Lab 2 statuses. None of the 155 seeded tickets are created with `WAITING_FOR_REQUESTER`, `REOPENED`, or `CANCELLED`.
    ````

    **Comment 3**
    ````
    [server/prisma/seed.ts]
    # Seed Ticket Upsert Leaves Existing Tickets with `itPriority = UNASSIGNED`:

    - `specification.md` Section 8 BR-29.

    - In `server/prisma/seed.ts` lines 204-206, 242-244, 291-293, `prisma.ticket.upsert` only updates `ownerId`:
        ```ts
        update: {
            ...(ownerId ? { ownerId } : {})
        },
        ```
        If tickets already exist in the database from Lab 2 with `itPriority = UNASSIGNED`, re-running seed does not populate `itPriority` to match `requestedPriority`.
    ````

    **Comment 4**
    ```
    I followed the test instruction in PR description.
    The following are what I found.

    ## Spec misalign
    I've commented on migration script, and seeding script.
    Please check it out.

    ---

    ### Not a major mistake but worth mentioning:
    In section 6 of testing instruction, when I look at `Ticket` table, I only found 155 records.
    **Note:** I perform `docker compose down -v` before following the testing instructions.
    ```

    **How I responded:**
    ```
    My bad on that, Thanks for the detailed review, I'm on it and will push the updates shortly.
    ```

    **How I responded:**
    ```
    Thanks for catching these! All requested changes have been resolved in commit

    1. Migration IT Priority: Added UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" = 'UNASSIGNED'; to properly initialize existing tickets per BR-29.
    2. Seed Status Array: Expanded the runtime statuses array to include all 8 Lab 3 statuses (previously only 5 were included).
    3. Seed Ticket Upsert: Added itPriority to the update: block in all ticket upserts so existing tickets get updated correctly on re-runs.
    4. Ticket Count Clarification: The 176 tickets mentioned previously in the PR description was a typo. The intended seed count on a clean database is indeed 155 records (128 + 25 + 2). I have updated the PR description accordingly.
    ```

    **Comment 5**
    ```
    Good to go. Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #43: feature/lab3-db-migration
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/43
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/34
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    - The application gracefully handles the "0 tickets" empty state without throwing a totalPages undefined crash.
    - Status filter dropdown includes all 8 valid system statuses
    - 8 system statuses display appropriate Zen Green semantic badge styles.
    - Client builds without TypeScript compiler errors.
    - Automated backend regression test suites pass.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Ready! Please go ahead and merge. Thank
    ```

### PR #44: feature/lab3-auth
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/44
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/35
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    [server/tests/lab-03/auth.api.test.ts]
    ### Missing Tests / Test Issues

    รายการ Tests ที่ระบุไว้ใน `docs/lab-03/tests.md` ซึ่งอยู่ในขอบเขตของ **Issue #35 / PR #44** แต่ยังขาดหายไปหรือไม่ครบถ้วน:

    1. **`UNIT-17` (Session Expiry Logic) — ขาดหายไปใน Server Test**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 134 กำหนดให้มี `UNIT-17` อยู่ใน `server/tests/lab-03/auth.api.test.ts` เพื่อทดสอบว่า session หมดอายุเมื่อเกิน 8-hour idle timeout หรือ 24-hour absolute timeout
       * **สถานะปัจจุบัน**: ไม่มี test case นี้ในไฟล์ `auth.api.test.ts` เลย
    2. **`SEC-04` (Session Cookie Security Attributes) — การตรวจสอบไม่ครบถ้วน**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 238 กำหนดให้ตรวจสอบ `HttpOnly=true`, `SameSite=Lax`, `Path=/`
       * **สถานะปัจจุบัน**: ใน `auth.api.test.ts` (บรรทัด 41) มีเพียง `expect(res.headers['set-cookie']).toBeDefined()` แต่ไม่ได้ assert คุณลักษณะ `HttpOnly`, `SameSite=lax` และ `Path=/`
    3. **`UNIT-01` (Password Policy Boundary) — ขาด Boundary Cases ที่ 128 และ 129 ตัวอักษร**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 118 ระบุชัดเจนว่าต้องทดสอบ *"7 rejected, 8 accepted, 128 accepted, 129 rejected"*
       * **สถานะปัจจุบัน**: มีการทดสอบความยาว < 8 ตัวอักษร แต่ไม่มี test case ตรวจสอบรหัสผ่านความยาว 128 (ต้องผ่าน) และ 129 ตัวอักษร (ต้องถูกปฏิเสธ)
    4. **`UI-03` (Login - Duplicate Submission / Busy State) — ขาดการ Assert ใน Client Test**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 144 กำหนดให้มี `UI-03` ทดสอบว่าปุ่ม submit ถูก disable ขณะกำลังโหลด และป้องกันการยิง request ซ้ำ
       * **สถานะปัจจุบัน**: ใน `client/tests/lab-03/Login.test.tsx` มีเพียงคอมเมนต์ `// UI-03 & UI-04` แต่เนื้อหาเทสมีเฉพาะ UI-04 ไม่มีการ assert ปุ่ม disabled หรือ loading spinner ขณะ submitting
    5. **`UI-10` (Change Password Navigation Lock) — ขาดการ Assert ใน Client Test**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 151 กำหนดให้ทดสอบว่าผู้ใช้ที่ติดสถานะ `mustChangePassword` ไม่สามารถข้ามหน้า Change Password เข้าไปยังหน้าทั่วไปได้
       * **สถานะปัจจุบัน**: ใน `client/tests/lab-03/ChangePassword.test.tsx` มีเพียงคอมเมนต์ `// UI-08 & UI-10` แต่เนื้อหาเทสมีเพียงการเช็ค policy error ไม่ได้ทดสอบ navigation lock
    6. **`SEC-05` (No Storage Tokens) — ขาดหายไปใน Client Test**:
       * **Spec**: `docs/lab-03/tests.md` บรรทัด 239 กำหนดให้ `client/tests/lab-03/Login.test.tsx` ทดสอบว่าไม่มีการบันทึก session token ใน `localStorage` หรือ `sessionStorage`
       * **สถานะปัจจุบัน**: ไม่มี test case ตรวจสอบ web storage ใน `Login.test.tsx`
    7. **ขาด Test ตรวจสอบ Session Rotation**:
       * ยังไม่มี test case ใดตรวจสอบว่าหลังเรียก `/api/auth/change-password` สำเร็จ session token อันเดิมจะต้องถูกยกเลิก และได้รับ session cookie ค่าใหม่
    ```

    **Comment 2**
    ```
    ### Findings

    #### Major

    1. **ไม่มีการหมุนเวียน Session Token (Session Rotation) เมื่อเปลี่ยนรหัสผ่านสำเร็จ**
       * **ปัญหา**: เมื่อเรียก `POST /api/auth/change-password` สำเร็จ ระบบเพียงแค่ลบ session อื่นของผู้ใช้นั้น แต่**ไม่ได้สร้าง session token ใหม่**และไม่ได้ส่ง cookie ใหม่กลับไป โดยยังคงใช้ session token เดิมที่เคยเป็น restricted session ต่อไป
       * **ไฟล์ / ตำแหน่ง**: [`server/src/app.ts:239-254`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L239-L254)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/api-spec.md` หัวข้อ 3 (`POST /auth/change-password`):
         > *- old sessions invalidated as required by the implementation;*
         > *- current restricted session is rotated to a normal authenticated session.*
       * **สิ่งที่ควรแก้**: ใน handler ของ `POST /api/auth/change-password` ให้สั่ง revoke token ปัจจุบันใน DB ด้วย จากนั้นเรียก `createSession(userId)` เพื่อสร้าง session token ใหม่ แล้วส่ง cookie ค่าใหม่ผ่าน `res.cookie(COOKIE_NAME, newToken, getCookieOptions(isSecure))`

    2. **มีกฎ Password Policy ที่อยู่นอกเหนือ Specification ในฝั่ง Client (`ChangePasswordPage`)**
       * **ปัญหา**: ในหน้า `ChangePasswordPage.tsx` มีการเพิ่มกฎ *"No more than 5 identical consecutive characters"* (`/(.)\1{5,}/.test(newPwd)`) ซึ่งไม่มีระบุอยู่ใน specification, ui-spec หรือ backend ทำให้รหัสผ่านที่ถูกต้องตาม BR-13 (เช่น มีตัวอักษรซ้ำกันเกิน 5 ตัวแต่มีทั้งตัวพิมพ์เล็ก, ใหญ่, ตัวเลข, สัญลักษณ์ครบ) ถูก Client บล็อกไม่ให้บันทึก นอกจากนี้การตรวจสอบความยาวใน Client ยังใช้ `newPwd.length` ดิบ แทนที่จะเป็น trimmed length ตาม BR-13
       * **ไฟล์ / ตำแหน่ง**: [`client/src/pages/ChangePasswordPage.tsx:73, 87`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/client/src/pages/ChangePasswordPage.tsx#L73)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/specification.md` (BR-13), `docs/lab-03/ui-spec.md` (Section 4), `docs/lab-03/api-spec.md` (Section 3)
       * **สิ่งที่ควรแก้**: ลบเงื่อนไข consecutive characters ออกจาก `rules` และฟังก์ชัน `validateClient()` ใน `ChangePasswordPage.tsx` และปรับการตรวจสอบความยาวให้ใช้ `newPwd.trim().length`

    3. **เปิดเผยการมีอยู่ของ Ticket / Attachment ของผู้อื่น (Existence Disclosure: ส่งกลับ 403 แทนที่จะเป็น safe 404)**
       * **ปัญหา**: ใน endpoint `GET /api/tickets/:id` และฟังก์ชัน `getOwnedAttachment` หาก Ticket/Attachment เป็นของ Requester ท่านอื่น ระบบจะตอบกลับด้วย `403 FORBIDDEN` (`"You do not have permission to view this ticket"` / `"Not ticket owner"`) แต่หากไม่พบ record ใน DB เลยจะตอบ `404 NOT_FOUND` ซึ่งทำให้ผู้ไม่ประสงค์ดีสามารถสุ่ม ID เพื่อทำ Account/Resource Enumeration ได้
       * **ไฟล์ / ตำแหน่ง**: [`server/src/app.ts:416-418, 461-464, 499-501`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L416-L418)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/specification.md` (BR-20: *"Ownership failures for protected Ticket/Attachment resources MUST not disclose whether another user's resource exists."*), `docs/lab-03/api-spec.md` (Section 1: *"Never return ... another user's protected resource existence"*, Section 4: *"If not owned, use safe 404 behavior"*), `docs/lab-03/tests.md` (SEC-08)
       * **สิ่งที่ควรแก้**: ปรับให้ส่งกลับ `404 NOT_FOUND` (ด้วย error message ทั่วไป เช่น `"Ticket not found"` หรือ `"Attachment not found"`) ทั้งในกรณีที่ไม่พบ record และกรณีที่ record นั้นไม่ได้เป็นของ Requester ที่ authenticate อยู่

    4. **รูปแบบ Error Response ใน `POST /api/auth/change-password` ขาดฟิลด์ `message`**
       * **ปัญหา**: เมื่อเกิด Validation Error ในการเปลี่ยนรหัสผ่าน (เช่น รหัสผ่านไม่ตรงกัน, ไม่ผ่าน policy, รหัสเดิมผิด, รหัสใหม่เหมือนรหัสเดิม) ระบบส่งกลับ `{ error: { code: 'VALIDATION_ERROR', fieldErrors: { ... } } }` โดยไม่มีฟิลด์ `message` ในระดับบนของอ็อบเจกต์ `error`
       * **ไฟล์ / ตำแหน่ง**: [`server/src/app.ts:209-236`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L209-L236)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/api-spec.md` หัวข้อ 1 (Standard JSON error format ระบุว่า `message` เป็นฟิลด์บังคับ ส่วน `fieldErrors` เป็น optional)
       * **สิ่งที่ควรแก้**: เพิ่ม `message: 'Validation failed.'` เข้าไปใน error payload ของทุกกรณีที่ตอบ status 422

    ---

    #### Minor

    5. **Cookie `maxAge` สิ้นอายุหลัง 8 ชม. เสมอ แม้ผู้ใช้จะ active ต่อเนื่อง (ไม่ครอบคลุม 24-hr Absolute Window ตาม BR-12)**
       * **ปัญหา**: ใน `getCookieOptions()` มีการตั้งค่า cookie `maxAge: SESSION_IDLE_MS` (8 ชั่วโมง) แต่ฝั่ง Server ไม่มีการต่ออายุ Cookie (sliding `Set-Cookie`) บน HTTP response แต่ละครั้ง ทำให้เบราว์เซอร์จะลบ cookie ทิ้งทันทีเมื่อครบ 8 ชั่วโมงนับจาก login แม้ว่าผู้ใช้จะยังใช้งานและมีการอัปเดต `lastSeenAt` ใน DB อย่างสม่ำเสมอ ทำให้ไม่สามารถใช้งานได้ถึง 24 ชั่วโมงตามข้อกำหนด
       * **ไฟล์ / ตำแหน่ง**: [`server/src/auth.ts:36`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/auth.ts#L36)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/specification.md` (BR-12: *"Normal authenticated sessions expire after 8 hours of inactivity and no later than 24 hours after creation"*), `docs/lab-03/api-spec.md` (Section 1)
       * **สิ่งที่ควรแก้**: ตั้ง `maxAge` ของ Cookie ให้เท่ากับ `SESSION_ABSOLUTE_MS` (24 ชั่วโมง) เพื่อให้เบราว์เซอร์เก็บ cookie ไว้ แล้วให้ Server ตรวจสอบเงื่อนไข 8-hour idle timeout ผ่านฟิลด์ `lastSeenAt` ในฐานข้อมูล

    6. **Race condition ระหว่าง `setUser` กับ `setTimeout` ใน `ChangePasswordPage.tsx`**
       * **ปัญหา**: หลังเปลี่ยนรหัสผ่านสำเร็จ มีการเรียก `setUser(updated)` ทันที แล้วจึงเรียก `setTimeout(..., 1500)` เพื่อ navigate แต่เนื่องจาก `RequirePasswordChange` ใน `App.tsx` คอยฟังการเปลี่ยนแปลงของ `user.mustChangePassword` อยู่ เมื่อค่านั้นกลายเป็น `false` ตัว guard จะสั่ง `<Navigate to={landing} replace />` ทันที ทำให้ component ถูก unmount ก่อนที่ timeout 1.5 วินาทีจะทำงาน ส่งผลให้ผู้ใช้แทบไม่เห็นข้อความ Success Feedback
       * **ไฟล์ / ตำแหน่ง**: [`client/src/pages/ChangePasswordPage.tsx:103-111`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/client/src/pages/ChangePasswordPage.tsx#L103-L111)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/ui-spec.md` หัวข้อ 4 (*"Show success feedback... Navigate to the appropriate role landing screen."*)
       * **สิ่งที่ควรแก้**: ย้ายการเรียก `setUser(updated)` เข้าไปไว้ใน callback ของ `setTimeout` พร้อมกับ `navigate(...)` เพื่อให้แสดงผลข้อความแจ้งเตือนสำเร็จครบ 1.5 วินาทีก่อนเปลี่ยนหน้า

    7. **โค้ดเก่า `localStorage.getItem('activeRequester')` ยังหลงเหลืออยู่ใน `AuthContext.tsx`**
       * **ปัญหา**: ในฟังก์ชัน `useAuth()` มีการอ่าน `localStorage.getItem('activeRequester')` เพื่อ fallback identity แม้ว่าจะไม่ได้ถูกใช้งานใน production flow แต่ข้อกำหนดระบุชัดเจนว่ากลไก client-side requester selector และ state เก่าจะต้องถูกลบออกให้หมด และไม่ให้ใช้ web storage สำหรับ auth state
       * **ไฟล์ / ตำแหน่ง**: [`client/src/AuthContext.tsx:62-76`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/client/src/AuthContext.tsx#L62-L76)
       * **Requirement / Spec ที่ขัดแย้ง**: `docs/lab-03/specification.md` (Section 4 Rule 2, BR-59), `docs/lab-03/tests.md` (SEC-05)
       * **สิ่งที่ควรแก้**: นำบล็อก `try { localStorage.getItem('activeRequester') }` ออกจาก `AuthContext.tsx` ให้จัดการ fallback state ในหน่วยความจำเท่านั้น

    8. **ขาดการครอบ `try/catch` ใน Express Async Middleware `requireAuth`**
       * **ปัญหา**: `requireAuth` เป็น `async function` แต่ไม่มี `try/catch` ครอบการเรียก `getSessionUser(token)` หาก DB เกิดข้อผิดพลาดชั่วคราว (connection error) ใน Express 4 จะกลายเป็น Unhandled Promise Rejection ทำให้ request ค้าง (hang) แทนที่จะตอบกลับ 500
       * **ไฟล์ / ตำแหน่ง**: [`server/src/auth.ts:187-204`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/auth.ts#L187-L204)
       * **Requirement / Spec ที่ขัดแย้ง**: Standard API error handling (`api-spec.md` Section 1)
       * **สิ่งที่ควรแก้**: ใส่ `try { ... } catch (err) { next(err); }` ครอบเนื้อหาภายใน `requireAuth`
    ```

    **How I responded:**
    ```
    On it! I'll get this fixed right away.
    ```

    **Comment 3**
    ```
    - [x] Stardard login flow
    - [x] Role based web page
    - [x] Can't login to inactive account
    - [x] First login forces password change
    - [x] Logging out cleared cookies

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Yes, I am ready for the merge.
    ```

### PR #45: feature/lab3-requester-comments
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/45
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/36
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ````
    # Specs misalignment
    Since they appears on several files, I'll put them here.

    ### Internal Notes Route Path Mismatch with API Specification

    * **Severity:** **Major**
    * **Location:**
      * [`server/src/app.ts:633`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L633) (`app.post('/api/tickets/:id/internal-notes', ...)`)
      * [`server/src/app.ts:683`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L683) (`app.get('/api/tickets/:id/internal-notes', ...)`)
      * [`server/tests/lab-03/comments-notes.api.test.ts:221, 232, 245, 260, 272, 275, 291, 294`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/tests/lab-03/comments-notes.api.test.ts#L221)
    * **Requirement:** [`docs/lab-03/api-spec.md` Section 7](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-03/api-spec.md#L445-L474):
      ```markdown
      ## 7. Internal Notes
      ### POST `/staff/tickets/:ticketId/internal-notes`
      ### GET `/staff/tickets/:ticketId/internal-notes`
      ```
    * **Problem:**
      The REST API specification explicitly specifies Internal Notes under the `/staff/tickets/:ticketId/internal-notes` namespace (i.e. `/api/staff/tickets/:id/internal-notes`), consistent with all other staff operations (`/staff/tickets/:ticketId`, `/staff/tickets/:ticketId/claim`, `/staff/tickets/:ticketId/status`).
      The PR implemented them at `/api/tickets/:id/internal-notes` and wrote the test suite to target this un-namespaced URL. Consequently:
      1. Any client or IT Staff detail view following [`docs/lab-03/api-spec.md`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-03/api-spec.md) will receive `404 Not Found`.
      2. Placing Internal Notes under `/api/tickets/...` obscures the architectural boundary that Internal Notes belong strictly to the Staff workflow.
    * **Suggested Fix:**
      Mount the route handlers at `/api/staff/tickets/:id/internal-notes` (or support both `/api/staff/tickets/:id/internal-notes` and `/api/tickets/:id/internal-notes` as an alias for backwards compatibility) and update [`comments-notes.api.test.ts`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/tests/lab-03/comments-notes.api.test.ts) to verify `/api/staff/tickets/:ticketId/internal-notes`.


    ### Role Authorization Allows `ADMINISTRATOR` to Post Public Comments

    * **Severity:** **Major**
    * **Location:** [`server/src/app.ts:548-575`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L548-L575) (`POST /api/tickets/:id/public-comments`)
    * **Requirement:**
      * [`docs/lab-03/api-spec.md:221-224`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-03/api-spec.md#L221-L224):
        ```markdown
        ### POST `/tickets/:ticketId/public-comments`
        Roles:
        - Requester: only own Ticket.
        - IT Staff: any Ticket permitted by Staff workflow.
        ```
      * [`docs/lab-03/specification.md:215`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-03/specification.md#L215) (Role Authorization Matrix):
        `| Public Comments | Own Tickets | Any authorized staff Ticket | Only where the Administrator is otherwise authorized to view the Ticket |`
      * [`docs/lab-03/specification.md:174 (BR-41)`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/docs/lab-03/specification.md#L174):
        `"Administrator responsibilities remain conceptually separate from IT Staff operations. The Lab 3 authorization matrix does not grant Administrator Ticket workflow operations..."`
    * **Problem:**
      In [`server/src/app.ts`](file:///c:/Users/acer/Desktop/test-karn/TokTickIT/server/src/app.ts#L573-L575), the ownership check is only applied if `role === 'REQUESTER'`:
      ```typescript
      if (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      ```
      Because there is no check preventing `ADMINISTRATOR`, an Administrator can call `POST /api/tickets/:id/public-comments` and create a public comment. The specification explicitly restricts creation of Public Comments to `REQUESTER` and `IT_STAFF`, while `ADMINISTRATOR` is read-only.
    * **Suggested Fix:**
      Add a role check to reject `ADMINISTRATOR` with `403 Forbidden` on public comment creation:
      ```typescript
      if (req.sessionUser!.role === 'ADMINISTRATOR') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrators are not permitted to post public comments.' } });
      }
      ```
    ````

    **Comment 2**
    ```
    - [x] Comment section working properly
    - [x] Text section XSS safety
    - [x] Clicking Problem Appears Resolved shows banner while ticket status badge remains unchanged

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    All ready on my end. You can merge now.
    ```

### PR #46: feature/lab3-staff-queue
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/46
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/37
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    - [x] /staff/queue page functions properly
    - [x] Normal requesters can't access /staff/queue

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #47: feature/lab3-staff-operations
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/47
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/38
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    - [x] Automated tests passed
    - [x] Followed manual verification in the web browser. No issues.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #48: feature/lab3-admin-user-management
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/48
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/39
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    - [x] Code aligns perfectly with specs
    - [x] Followed manual verification instruction and everything works great.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #49: feature/lab3-release-integration
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/49
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/40
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    - [x] All the automate tests passed
    - [x] Followed the manual testing instructions, the app functioned correctly
    - [x] Align with designed lab3 specs

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Glad to hear that! It's good to go, please proceed with the merge.
    ```

### PR #50: lab3-staging (release to main)
- **Link:** https://github.com/RBKarnz/TokTickIT/pull/50
- **Issue** https://github.com/RBKarnz/TokTickIT/issues/32, https://github.com/RBKarnz/TokTickIT/issues/33, https://github.com/RBKarnz/TokTickIT/issues/34, https://github.com/RBKarnz/TokTickIT/issues/35, https://github.com/RBKarnz/TokTickIT/issues/36, https://github.com/RBKarnz/TokTickIT/issues/37, https://github.com/RBKarnz/TokTickIT/issues/38, https://github.com/RBKarnz/TokTickIT/issues/39, https://github.com/RBKarnz/TokTickIT/issues/40
- **Comment:** 
 **Reviewer comment I received:**
    **Comment 1**
    ```
    ### Failing Playwright Test: `e2e/lab-03/visual-screenshots.spec.ts`

    **Location:** `e2e/lab-03/visual-screenshots.spec.ts:553`
    **Test:** `10-direct-api-401-403-evidence: Access Denied / 403 Forbidden state for unauthorized access`

    #### Root Cause:
    Commit `2d48e1e` (`fix(tickets): return 404 for requester cross-access on GET /api/tickets/:id for non-enumeration`) updated `server/src/app.ts` to return `HTTP 404 Not Found` (anti-enumeration per **BR-20**) instead of `403 Forbidden` when a requester attempts to open another requester's ticket.

    As a result, `TicketDetailPage.tsx` now renders:
    - **Heading:** `<h2>Ticket Not Found</h2>` (instead of `<h2>Access Denied</h2>`)
    - **Icon:** `<i className="bi bi-search text-danger">` (instead of `<i className="bi bi-shield-x">`)

    However, `visual-screenshots.spec.ts` (lines 572–576) was not updated and times out waiting for `Access Denied` and an `HTTP 403` status.

    #### Required Fix (Choose one):
    - **Option A (Align with Safe 404 Anti-Enumeration):** Update lines 572–576 in `e2e/lab-03/visual-screenshots.spec.ts` to assert:
      - `page.locator('h2:has-text("Ticket Not Found")')`
      - `page.locator('.bi-search')`
      - `apiResponses.find((r) => r.status === 404)`
      And adjust the screenshot overlay title to reflect safe 404 non-enumeration evidence.
    - **Option B (Target a Legitimate 403 Endpoint):** If the evidence must specifically demonstrate `HTTP 403 Forbidden` for Part 7 direct API authorization, point the test to a staff-only API that rejects requesters with 403 (e.g., `GET /api/staff/tickets/1/internal-notes` or `POST /api/staff/tickets/1/status`).
    ```

    **How I responded:**
    ```
    Could you please check this again?
    ```

    **Comment 2**
    ```
    The recent fix in successfully aligns test.
    The full visual test suite now executes with a 100% pass rate, and the application satisfies all Lab 3 engineering specifications, RBAC rules, and responsive criteria.

    Tell me if you're ready for the merge.
    ```

    **How I responded:**
    ```
    Thanks for putting in so much work on this. Couldn't have done it without your help and dedication. Could you please merge my pull request?
    ```

--------------------------------------------------------------------------------------------------------

## Pull Requests I reviewed for my partner


### PR #26: docs/lab3-specs
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/26
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/25
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] โครงสร้างเอกสาร specification.md ครบถ้วนทั้ง 11 Sections ตามข้อกำหนดของ Lab 3
    - [x] เอกสาร ui-spec.md ออกแบบครอบคลุมทั้ง 6 หน้าจอหลัก พร้อม Zen Green Tokens และตาราง Visual Checklist
    - [x] เอกสาร api-spec.md กำหนด Role-Based Authorization Matrix, CSRF Justification และโครงสร้าง Error Response ชัดเจน
    - [x] แผนการทดสอบใน tests.md ครอบคลุมทั้ง API, UI, E2E พร้อมตาราง Traceability Matrix ครบ 100%
    - [x] Admin Safety Guards ป้องกันการปิดบัญชีตัวเองหรือ Admin คนสุดท้ายได้อย่างถูกต้อง
    - [ ] ความเสี่ยงด้าน Regression Tests กับข้อมูลเดิม: การวางแผนเปลี่ยนโดเมนอีเมลเป็น @toktickit.com ใน spec ขัดแย้งกับชุดทดสอบเดิมของ Lab 2 (server/tests/lab-02/) ที่ฮาร์ดโค้ดค้นหาผู้ใช้ด้วย @kmutt.ac.th (เช่น jennifer.anderson@kmutt.ac.th) ซึ่งจะทำให้เทสต์เดิมทั้ง 43 ข้อหาข้อมูลไม่เจอและรันไม่ผ่านทันที ควรระบุการคงอีเมลเดิมไว้สำหรับข้อมูลชุดเดิม
    - [ ] ผลกระทบจากการย้าย Role ผู้ใช้เดิม: การปรับ Michael Brown และ David Lee ให้เป็น IT_STAFF ส่งผลให้ Michael Brown ไม่สามารถเข้าถึงตั๋วเดิม 25 ใบในหน้า My Tickets (ถูกบล็อก 403) และทำให้เทสต์เดิมของ Lab 2 ที่ใช้ David Lee ตรวจสอบสิทธิ์การเข้าถึงทำงานเพี้ยน ควรคงผู้ใช้เดิมทั้งหมดจาก Lab 2 เป็น REQUESTER แล้วเพิ่ม Seed บัญชีใหม่สำหรับ IT Staff แยกต่างหาก
    - [ ] ความไม่สอดคล้องกันระหว่าง UI และ API ในกระบวนการปิดตั๋ว (CLOSED): ใน spec และ api-spec กำหนดให้สถานะ CLOSED ต้องส่ง resolutionSummary (อย่างน้อย 5 ตัวอักษร) แต่ใน ui-spec Modal การปิดตั๋วเป็นเพียงการกดยืนยันโดยไม่มีช่องกรอก ทำให้เมื่อส่งคำขอจริงจะติด Error 422 ควรระบุให้ชัดเจนว่าจะดึงข้อมูลเดิมจากตอน RESOLVED มาใช้ หรือต้องเพิ่มช่องกรอกในหน้า UI Modal
    - [ ] ขอบเขตสิทธิ์การจัดการไฟล์แนบของ IT Staff: ใน api-spec กำหนดให้การอัปโหลดไฟล์แนบทำได้เฉพาะ owned ticket only ส่งผลให้ IT Staff ไม่สามารถแนบไฟล์ภาพหรือ Log ลงในตั๋วของ Requester ขณะปฏิบัติงานได้ ควรปรับสิทธิ์ให้ IT Staff สามารถแนบไฟล์ลงในตั๋วที่กำลังดูแลได้ด้วย หรือบันทึกเหตุผลการออกแบบไว้ให้ชัดเจน
    - [ ] ข้อจำกัดของวงจรสถานะตั๋วหลังการปิดงาน: การกำหนดให้สถานะ CLOSED เป็น Terminal อย่างเด็ดขาดโดยไม่สามารถ Reopen ได้อีก อาจไม่สอดคล้องกับพฤติกรรมการใช้งานจริงหากปัญหาเดิมเกิดซ้ำหลังจากปิดงานไปแล้ว ควรพิจารณาเปิดให้สามารถ Reopen ตั๋วที่ปิดไปแล้วได้เพื่อความยืดหยุ่น
    - [ ] แผนการย้ายข้อมูล Enum ในฐานข้อมูล: การเปลี่ยนชื่อ Enum จาก PENDING เป็น WAITING_FOR_REQUESTER บน PostgreSQL มีความเสี่ยงต่อข้อมูลเดิมของ Lab 2 หากไม่มีคำสั่ง Custom SQL Migration (ALTER TYPE ... RENAME VALUE) รองรับ ควรระบุขั้นตอนจัดการข้อมูลส่วนนี้ใน Migration Strategy ให้ชัดเจน
    ```

    **Partner's response:**
    ```
    Thanks for reviewing my code!
    Working on it.
    ```

    **My comment 2**
    ```
    - [x] โครงสร้างเอกสาร specification.md ครบถ้วนทั้ง 11 Sections ตามข้อกำหนดของ Lab 3
    - [x] เอกสาร ui-spec.md ออกแบบครอบคลุมทั้ง 6 หน้าจอหลัก พร้อม Zen Green Tokens และตาราง Visual Checklist
    - [x] เอกสาร api-spec.md กำหนด Role-Based Authorization Matrix, CSRF Justification และโครงสร้าง Error Response ชัดเจน
    - [x] แผนการทดสอบใน tests.md ครอบคลุมทั้ง API, UI, E2E พร้อมตาราง Traceability Matrix ครบ 100%
    - [x] Admin Safety Guards ป้องกันการปิดบัญชีตัวเองหรือ Admin คนสุดท้ายได้อย่างถูกต้อง
    - [x] แก้ปัญหา Regression Tests ของ Lab 2 โดยใช้ Dual-Domain Seed คงอีเมล @kmutt.ac.th ให้ User เดิมทั้ง 5 คน เทสต์เก่า 43 ข้อใน server/tests/lab-02/ ผ่านได้หมดไม่พัง
    - [x] จัดการ Role ของ User เดิมเคลียร์แล้ว ให้ User จาก Lab 2 เป็น REQUESTER เหมือนเดิมเพื่อดูตั๋วเก่าใน My Tickets ได้ปกติ แล้วแยกบัญชี IT_STAFF ใหม่ไปใช้โดเมน @toktickit.com แทน
    - [x] ปรับ Flow ของ Resolution Summary ตอน CLOSED ตรงกันแล้ว ทั้ง API ที่ดึงค่าเดิมจากตอน RESOLVED มาใช้ต่อได้เลย และใน UI Modal ก็มีช่องให้เช็คหรือแก้ไขข้อความก่อนยืนยันปิดตั๋ว
    - [x] ปรับสิทธิ์ Attachment Upload ให้ IT_STAFF และ ADMINISTRATOR สามารถแนบไฟล์พวก Log หรือ Screenshot ลงในตั๋วที่ดูแลอยู่ผ่านหน้า Ticket Detail ได้จริง
    - [x] Lifecycle ของ Ticket ยืดหยุ่นขึ้น เปิดให้ IT_STAFF และ ADMINISTRATOR สามารถ Reopen ตั๋วที่ CLOSED ไปแล้วได้ พร้อมมี Confirmation Modal ให้ใส่เหตุผลประกอบ
    - [x] เพิ่มคำสั่ง Custom SQL Migration สำหรับ ALTER TYPE จาก PENDING ไปเป็น WAITING_FOR_REQUESTER ไว้ชัดเจนใน Migration Strategy ป้องกันข้อมูลตั๋วเดิมหลุดตอน Migrate
    ```

    **Partner's response:**
    ```
    Thank you for your thorough review and constructive feedback.

    Feel free to merge whenever you feel like it.
    ```

### PR #33: feature/lab3-auth-foundation
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/33
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/27
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง server และ client ไม่แสดง error ใด ๆ  และ npx tsc --noEmit ไม่แสดง error ใด ๆ
    - [x] ระบบ Protected Route Guard ทำงานถูกต้อง เมื่อเข้า URL ตรงแบบยังไม่ล็อกอิน (เช่น /tickets/new) จะถูก Redirect ไปหน้า /login ทันที
    - [x] ระบบ Destination Restoration ทำงานได้จริง เมื่อล็อกอินสำเร็จจะพาผู้ใช้ไปยังหน้าที่ตั้งใจจะเข้าก่อนหน้าโดยอัตโนมัติ
    - [x] ระบบบังคับเปลี่ยนรหัสผ่านครั้งแรก (First-Login) ทำงานถูกต้อง ดักจับผู้ใช้ที่มีสถานะ mustChangePassword = true ไปยังหน้า /change-password และบล็อกไม่ให้แอบเข้าหน้าอื่น
    - [x] Live Password Complexity Checklist บนหน้า Change Password ตรวจสอบเงื่อนไข 3 ข้อ (8 ตัวอักษร, พิมพ์ใหญ่-เล็ก, ตัวเลขและอักขระพิเศษ) แบบ Real-time ได้ถูกต้อง
    - [x] ระบบ Login ปลอดภัย ไม่เปิดเผยข้อมูล (Non-enumerating error message) และเก็บรักษาข้อมูลอีเมลในฟอร์มไว้เมื่อล็อกอินไม่สำเร็จ (Form retention)
    - [x] ถอดระบบ Development Requester Selector ของเดิมออกหมดจด ไม่มีหน้าต่างเด้งให้เลือกหรือปุ่ม Switch Requester ใน Header หลงเหลืออยู่
    - [ ] ติดปัญหา Unhandled Rejection ใน client npm test: ในไฟล์ client/tests/lab-02/MyTickets.test.tsx ข้อ UI-05 มีการจำลองกดปุ่ม Sign Out แต่ลืม mock ฟังก์ชัน api.logout ใน beforeEach ทำให้ตัวเทสต์พยายามยิง network request จริงไปที่ http://localhost:3000/api/auth/logout ส่งผลให้ Vitest ฟ้อง error connect ECONNREFUSED 127.0.0.1:3000 (แนะนำให้เพิ่ม vi.spyOn(api, "logout").mockResolvedValue(undefined); ใน beforeEach ของไฟล์ดังกล่าว)
    - [ ] ช่องโหว่ความปลอดภัยหลังรัน npm install: ตัว npm audit แจ้งเตือนช่องโหว่ระดับ High และ Critical จากแพ็กเกจ vitest / nanoid แนะนำให้รัน npm audit fix เพื่อลดช่องโหว่ แต่ไม่ควรใช้ --force เพราะจะไปดึง Vitest รุ่นใหม่ข้าม Major version ที่อาจทำให้เทสต์เดิมพัง
    ```

    **Partner's response:**
    ```
    Working on it.
    ```

    **My comment 2**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง server และ client ไม่แสดง error ใด ๆ  และ npx tsc --noEmit ไม่แสดง error ใด ๆ
    - [x] ระบบ Protected Route Guard ทำงานถูกต้อง เมื่อเข้า URL ตรงแบบยังไม่ล็อกอิน (เช่น /tickets/new) จะถูก Redirect ไปหน้า /login ทันที
    - [x] ระบบ Destination Restoration ทำงานได้จริง เมื่อล็อกอินสำเร็จจะพาผู้ใช้ไปยังหน้าที่ตั้งใจจะเข้าก่อนหน้าโดยอัตโนมัติ
    - [x] ระบบบังคับเปลี่ยนรหัสผ่านครั้งแรก (First-Login) ทำงานถูกต้อง ดักจับผู้ใช้ที่มีสถานะ mustChangePassword = true ไปยังหน้า /change-password และบล็อกไม่ให้แอบเข้าหน้าอื่น
    - [x] Live Password Complexity Checklist บนหน้า Change Password ตรวจสอบเงื่อนไข 3 ข้อ (8 ตัวอักษร, พิมพ์ใหญ่-เล็ก, ตัวเลขและอักขระพิเศษ) แบบ Real-time ได้ถูกต้อง
    - [x] ระบบ Login ปลอดภัย ไม่เปิดเผยข้อมูล (Non-enumerating error message) และเก็บรักษาข้อมูลอีเมลในฟอร์มไว้เมื่อล็อกอินไม่สำเร็จ (Form retention)
    - [x] ถอดระบบ Development Requester Selector ของเดิมออกหมดจด ไม่มีหน้าต่างเด้งให้เลือกหรือปุ่ม Switch Requester ใน Header หลงเหลืออยู่
    - [x] แก้ไขปัญหา Unhandled Rejection ใน client npm test เรียบร้อย: ตรวจสอบไฟล์ `client/tests/lab-02/MyTickets.test.tsx` พบว่ามีการเพิ่ม `vi.spyOn(api, "logout").mockResolvedValue(undefined);` ใน `beforeEach` เรียบร้อยแล้ว ทำให้การรันเทสต์ UI-05 ไม่มีการยิง network request จริงออกไป ผลการรัน `npm test` ใน client ผ่านครบ 37/37 tests โดยไม่พบ error `ECONNREFUSED` หรือ Unhandled Rejection อีก
    - [x] ตรวจสอบและจัดการความปลอดภัย npm audit เรียบร้อย: ตรวจสอบแล้วพบว่ารัน `npm audit fix` ปิดช่องโหว่ของแพ็กเกจย่อย (เช่น `nanoid`, `body-parser`) ไปแล้วเรียบร้อย ส่วนการแจ้งเตือนระดับ High/Critical ที่ยังหลงเหลืออยู่ใน `client` มาจากแพ็กเกจ `vitest` ของ template เริ่มต้น ซึ่งเป็น devDependency และแพตช์อัปเกรดอยู่บน Major version ถัดไป (v3+) จึงสรุปว่าไม่ควรใช้ `--force` เพื่อป้องกันไม่ให้เทสต์เดิมพัง สามารถใช้งานและรันเทสต์ต่อไปได้ตามปกติ
    ```

    **Partner's response:**
    ```
    Thanks.

    I'm ready for the merge.
    ```

### PR #35: feature/lab3-arch-reconstruction
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/35
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/34
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ npx tsc --noEmit ไม่แสดง error ใด ๆ
    - [x] ตรวจสอบไฟล์ `server/src/app.ts` มีความยาว 26 บรรทัดจริง ซึ่งผ่านเกณฑ์ที่กำหนด < 100 บรรทัด
    - [x] ตรวจสอบไฟล์ `client/src/App.tsx` มีความยา 20 บรรทัดจริง ซึ่งผ่านเกณฑ์ที่กำหนด < 80 บรรทัด
    - [x] ตรวจสอบ Layer Boundaries: ทั้ง `server/src/core/` และ `client/src/core/`  ไม่มีการ import ใดๆ มาจาก `features/`
    - [x] ทดสอบทั้ง 5 จุด
        - `/login`: แสดงหน้าเข้าสู่ระบบได้ถูกต้อง และจำหน้าที่พยายามจะเข้าก่อนหน้านี้ได้
        - `/change-password`: ถ้าผู้ใช้ยังไม่ได้เปลี่ยนรหัสผ่านครั้งแรก ระบบจะบังคับให้อยู่หน้านี้จนกว่าจะเปลี่ยนรหัสผ่านเสร็จ
        - `/tickets`: แสดงรายการตั๋วและสถานะระบบได้ครบถ้วน
        - `/tickets/new`: เปิดหน้าสร้างตั๋วใหม่และส่งข้อมูลได้ตามปกติ
        - `/tickets/:id`: เปิดดูรายละเอียดของแต่ละตั๋วตาม ID ได้ถูกต้อง
    ```

    **Partner's response:**
    ```
    I'm ready for the merge.
    ```

### PR #36: feature/lab3-requester-continuity
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/36
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/28
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ npx tsc --noEmit ไม่แสดง error ใด ๆ
    - [x] Role Navigation Shell (UI-04):
      - ล็อกอิน Requester (`jennifer.anderson@kmutt.ac.th`): Navbar แสดงแท็บ "My Tickets" และปุ่ม "+ Create Ticket" ถูกต้อง
      - ล็อกอิน IT Staff (`staff.michael@toktickit.com`): Navbar แสดงแท็บ "My Queue" และปุ่ม "+ Create Ticket" ถูกต้อง
      - ล็อกอิน Administrator (`admin@toktickit.com`): Navbar แสดงแท็บ "Admin" และ Badge บทบาทผู้ดูแลระบบถูกต้อง
    - [ ] Problem Appears Resolved Flow (UI-09): ไม่พบตั๋วเลข `TKT-2026-000001` (`/tickets/1`) ในระบบ จากการตรวจสอบทั้งบนหน้าเว็บและ Adminer พบว่าใน Seed data ตั๋วเริ่มต้นของ Jennifer คือเลข `TKT-2026-000101` ให้ชี้แจ้งมาด้วยว่าในส่วนนี้จะต้องทดสอบใหม่ยังไง
    - [x] Public Comments Discussion Thread (FR-13):
      - แท็บ Public Comments ในหน้ารายละเอียดตั๋ว แสดงตัวนับตัวอักษรแบบ Real-time
      - หากข้อความเป็นค่าว่างหรือพิมพ์แค่ Spacebar ปุ่ม "Post Comment" จะถูก Disabled ไม่ให้กดส่ง
      - เมื่อกด Post Comment ปุ่มแสดงสถานะ Loading Spinner พร้อมเว้นระยะห่างของตัวหนังสือเรียบร้อย และโพสต์คอมเมนต์ขึ้นมาพร้อม Badge ผู้เขียนและเวลาได้อย่างถูกต้อง
    - [x] API Contract: Session Identity Binding (API-09): ทดสอบส่งคำสั่งผ่าน curl โดยแนบ JWT Token ของ Jennifer และจงใจส่ง Body ที่มี `requesterId: 999` ตรวจสอบ Response พบว่าค่า `requesterId` ในตั๋วที่สร้างออกมาเป็น `1` (ตรงตามตัวตนจริงของ Jennifer ใน Token) โดยเพิกเฉยต่อเลข 999 ตามข้อกำหนด
    - [x] API Contract: Cross-Requester Anti-Leakage Isolation (API-10): ทดสอบล็อกอินด้วยบัญชี David Lee แล้วใช้ Token ของ David ยิงดึงข้อมูลตั๋วของ Requester คนอื่น ระบบตอบกลับด้วย `HTTP Status: 404` พร้อม Body `{"error": "Ticket not found."}` เพื่อป้องกันการรั่วไหลของข้อมูลได้อย่างถูกต้อง

    **เพิ่มเติมเรื่องคำสั่ง curl บน Windows:**
    ในข้อ 3 (API Contract Verification) มีการใช้ `jq` และการตัดบรรทัดด้วย `\` ซึ่งสำหรับคนตรวจที่ใช้ Windows Terminal หรือ Git Bash จะติด error `jq: command not found` และหลุดบรรทัด แนะนำให้เพิ่มทางเลือกคำสั่งแบบ One-Liner  หรือแบบไม่ใช้ `jq` ไว้ใน PR Description สำหรับคนที่รันบน Windows
    ```

    **Partner's response:**
    ````
    > * [ ]  Problem Appears Resolved Flow (UI-09): ไม่พบตั๋วเลข `TKT-2026-000001` (`/tickets/1`) ในระบบ จากการตรวจสอบทั้งบนหน้าเว็บและ Adminer พบว่าใน Seed data ตั๋วเริ่มต้นของ Jennifer คือเลข `TKT-2026-000101` ให้ชี้แจ้งมาด้วยว่าในส่วนนี้จะต้องทดสอบใหม่ยังไง

    Can you try reseeding the database?
    ```bash
    cd server
    docker compose down -v
    docker compose up -d
    npx prisma migrate dev
    npm run prisma:seed
    npm run dev
    ```
    And verify again.
    ````

    **My comment 2**
    ```
    ลองแก้ไขตามที่ได้แจ้งมาแล้ว แต่ไม่พบตั๋วเลข `TKT-2026-000001` (`/tickets/1`)
    [screenshot attached in the original comment]
    [screenshot attached in the original comment]
    ```

    **Partner's response:**
    ```
    Ah my bad.
    I just realized that the Ticket No. in the testing instruction is 000001 and not 000101.
    I've updated the testing instruction.
    Changed Ticket No. from `000001` to `000101`.
    Please give it a try.
    ```

    **My comment 3**
    ```
    - [x] รันคำสั่ง npm test ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ npx tsc --noEmit ไม่แสดง error ใด ๆ
    - [x] Role Navigation Shell (UI-04):
      - ล็อกอิน Requester (`jennifer.anderson@kmutt.ac.th`): Navbar แสดงแท็บ "My Tickets" และปุ่ม "+ Create Ticket" ถูกต้อง
      - ล็อกอิน IT Staff (`staff.michael@toktickit.com`): Navbar แสดงแท็บ "My Queue" และปุ่ม "+ Create Ticket" ถูกต้อง
      - ล็อกอิน Administrator (`admin@toktickit.com`): Navbar แสดงแท็บ "Admin" และ Badge บทบาทผู้ดูแลระบบถูกต้อง
    - [x] Problem Appears Resolved Flow (UI-09): ทำการทดสอบโดยเข้าสู่ระบบด้วย Jennifer Anderson แล้วคลิกเลือกตั๋ว `TKT-2026-000101` จากนั้นกดปุ่ม "Mark as Resolved" ในแถบสีเขียวอ่อน และกดยืนยันผ่าน พบว่าข้อความในแถบอัปเดตเป็น *"You marked this problem as resolved. IT Staff will confirm and close the ticket."* อย่างถูกต้อง และสถานะของตั๋วยังคงเป็นสถานะเดิมก่อนที่จะทำการกดปุ่ม "Mark as Resolved" ตามเงื่อนไข
    - [x] Public Comments Discussion Thread (FR-13):
      - แท็บ Public Comments ในหน้ารายละเอียดตั๋ว แสดงตัวนับตัวอักษรแบบ Real-time
      - หากข้อความเป็นค่าว่างหรือพิมพ์แค่ Spacebar ปุ่ม "Post Comment" จะถูก Disabled ไม่ให้กดส่ง
      - เมื่อกด Post Comment ปุ่มแสดงสถานะ Loading Spinner พร้อมเว้นระยะห่างของตัวหนังสือเรียบร้อย และโพสต์คอมเมนต์ขึ้นมาพร้อม Badge ผู้เขียนและเวลาได้อย่างถูกต้อง
    - [x] API Contract: Session Identity Binding (API-09): ทดสอบส่งคำสั่งผ่าน curl โดยแนบ JWT Token ของ Jennifer และจงใจส่ง Body ที่มี `requesterId: 999` ตรวจสอบ Response พบว่าค่า `requesterId` ในตั๋วที่สร้างออกมาเป็น `1` (ตรงตามตัวตนจริงของ Jennifer ใน Token) โดยเพิกเฉยต่อเลข 999 ตามข้อกำหนด
    - [x] API Contract: Cross-Requester Anti-Leakage Isolation (API-10): ทดสอบล็อกอินด้วยบัญชี David Lee แล้วใช้ Token ของ David ยิงดึงข้อมูลตั๋วของ Requester คนอื่น ระบบตอบกลับด้วย `HTTP Status: 404` พร้อม Body `{"error": "Ticket not found."}` เพื่อป้องกันการรั่วไหลของข้อมูลได้อย่างถูกต้อง

    **เพิ่มเติมเรื่องคำสั่ง curl บน Windows:**
    ในข้อ 3 (API Contract Verification) มีการใช้ `jq` และการตัดบรรทัดด้วย `\` ซึ่งสำหรับคนตรวจที่ใช้ Windows Terminal หรือ Git Bash จะติด error `jq: command not found` และหลุดบรรทัด แนะนำให้เพิ่มทางเลือกคำสั่งแบบ One-Liner  หรือแบบไม่ใช้ `jq` ไว้ใน PR Description สำหรับคนที่รันบน Windows
    ```

    **Partner's response:**
    ```
    Thanks. I'm ready for the merge.
    ```

### PR #37: feature/lab3-staff-queue
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/37
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/29
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ
    - [x] Role Security Check: ล็อกอินด้วย Requester (`jennifer.anderson@kmutt.ac.th`) พบว่าไม่มีเมนู "My Queue" บน Navbar และเมื่อลองพิมพ์ URL เข้า `/queue` โดยตรง ระบบ Route Guard ทำการดักจับและ Redirect กลับไปที่หน้า `/tickets` ทันทีอย่างถูกต้อง
    - [x] Queue Triage Inspection: ล็อกอินด้วย IT Staff (`staff.michael@toktickit.com`) แล้วเปิดหน้า "My Queue" (`/queue`) ได้ โดยแสดงผลตารางครบทั้ง 8 คอลัมน์ได้ถูกต้อง
    - [x] Debounced Search & Multi-Filters: พิมพ์ค้นหาคำว่า `VPN` พบว่ามีการหน่วงเวลาก่อนยิง Request และตัวกรอง Status, Category, IT Priority, Owner (Unassigned) กรองผลลัพธ์ได้ถูกต้อง รวมถึงปุ่ม "Clear Filters" รีเซ็ตตารางกลับมาได้ปกติ
    - [x] Sorting & Pagination: หัวตาราง Ticket No, Created Date, IT Priority, และ Status มีลูกศรบอกทิศทาง สลับเรียงลำดับได้จริง พร้อมทั้งแสดงตัวนับจำนวนตั๋ว และปุ่มเปลี่ยนหน้าทำงานได้ปกติ
    - [x] Responsive Mobile Test: เมื่อทดสอบผ่าน DevTools ที่ความกว้างหน้าจอ < 768px ตารางยุบเป็นการ์ดแนวตั้ง (Stacked Cards) อัตโนมัติ เลื่อนดูได้ลื่นไหลโดยไม่มี Scrollbar แนวนอน และมี Touch Target ขนาด ≥ 44px จริง

    **เพิ่มเติมเรื่องการคลิกดูรายละเอียดตั๋ว**
    - ในหน้า `StaffQueueScreen` เมื่อคลิกที่ตั๋ว มีการสั่งไปที่ `/queue/:id` แต่จากใน `RouteGuard.tsx` ยังไม่มี matcher สำหรับ path นี้ ระบบเลยพาเด้งกลับไปที่หน้า fallback (`my-tickets`) ทำให้ขึ้นว่า *"No support tickets yet"*
    - Issue หลังจากนี้ต้องเก็บตกและเชื่อมต่อ Route `/queue/:id` เข้ากับ `StaffDetailScreen` ในรอบหน้าด้วย
    ```

    **Partner's response:**
    ```
    Feel free to merge when you feel like it.
    ```

### PR #38: feature/lab3-staff-ticket-detail
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/38
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/30
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x] รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ
    - [x] Staff Detail Navigation & Layout: เส้นทาง `/queue/:ticketId` ทำงานสมบูรณ์ Breadcrumbs, Metadata, Distinct row spacing, และ Layout แผงควบคุมต่างๆ แสดงผลสวยงามตรงตาม Design Spec
    - [x] Ticket Ownership: กรองแสดงเฉพาะ Staff/Admin ที่ Active และบันทึกการเปลี่ยน Owner ได้ทันทีและคงอยู่หลัง Reload
    - [x] Decoupled IT Priority: ปรับระดับ IT Priority ได้อิสระโดยไม่กระทบกับ Requester Priority badge
    - [x] Status Transitions & Validation Modals: มี Modal กำกับตาม State Machine พร้อม Validation บังคับกรอก Summary (≥ 5 ตัวอักษร) สำหรับ Resolve, เก็บรักษา Resolution Summary เมื่อ Close, และล็อค Disabled เมื่อ Cancelled
    - [x] Internal Notes Privacy Isolation: แผง Internal Notes แสดงเฉพาะ Staff ส่วน Requester ไม่เห็นและถูกบล็อกด้วย HTTP 403 เมื่อพยายามยิง API ตรง
    - [x] Staff Attachment Operations: อัปโหลดไฟล์และทำ Soft-removal พร้อมบังคับกรอกเหตุผลการลบได้อย่างถูกต้อง

    #### ข้อสังเกตและข้อเสนอแนะเพิ่มเติม:
    - ตำแหน่งแสดงผล Error ข้อความไม่พอยังไม่เป็นรูปแบบเดียวกัน:
      - ตอนเปลี่ยนสถานะทั่วไป เช่น กด Resolve ถ้าพิมพ์ไม่ถึง 5 ตัวอักษร ข้อความแจ้งเตือนจะแสดงอยู่ **ด้านล่างใต้กล่องข้อความภายใน Modal** (`Resolution summary is required and must be at least 5 characters.`) ซึ่งดูเรียบร้อยดี
      - แต่ตอนเปลี่ยนสถานะจาก **RESOLVED ไปเป็น CLOSED หรือ REOPENED** ถ้าข้อความผิดเงื่อนไข ข้อความแจ้งเตือนกลับเด้งไปแสดงเป็นแถบสีแดงอยู่ **ด้านบนข้างนอก Modal** บนหน้าจอหลัก (`resolutionSummary must be between 5 and 1000 characters.`)
    - **คำแนะนำ:** หากต้องการให้ UX มีความสม่ำเสมอ แนะนำให้ปรับการแจ้งเตือน Error ของทุกสถานะให้แสดงผลอยู่ภายใน Modal บริเวณใต้กล่องข้อความเหมือนกันทั้งหมดครับ สามารถปรับแก้จุดนี้แล้วส่งเข้ามาใหม่ได้หากต้องการ แต่ในภาพรวมระบบทำงานได้ถูกต้องครบถ้วนแล้ว
    ```

    **My comment 2**
    ```
    I've checked it for you. Tell me if you're ready for the merge.
    ```

    **Partner's response:**
    ```
    I'm ready.
    ```

### PR #39: feature/lab3-admin-user-management
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/39
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/31
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x]  รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ


    - [x] Step 1: Role-Based Access Control & Navigation: บัญชี IT Staff ไม่เห็นเมนูจัดการผู้ใช้ และเมื่อลองพิมพ์ URL `/admin/users` เข้าตรงๆ ถูก Route Guard สกัดและ Redirect กลับหน้า `/queue` รวมถึงยิง API ตรงได้รับ 403 Forbidden ถูกต้อง
    - [ ] Step 2: User Directory, Search, and Filtering:
      - ตัวข้อความคำว่า **`Users`** บนหน้าเว็บเป็นเพียงหัวข้อหน้าจอ (Page Heading) ขนาดใหญ่ที่ไม่ใช่ลิงก์ จึงไม่สามารถคลิกเพื่อ Navigate `/admin/users` ได้
      - **จุดที่ต้องแก้ไข:** ปรับชื่อลิงก์บน Navbar หรือ Route Link ให้ตรงตาม Specification และคำอธิบายใน PR Description ให้สามารถคลิกคำว่า "Users" เพื่อ Navigate ได้อย่างถูกต้อง หรือแก้ไข คำอธิบายใน PR Description ให้ถูกต้องไม่ขัดแย้งกัน
    - [x] Step 3: Create User & Mandatory Password Change: สร้างผู้ใช้ใหม่สำเร็จ บัญชีถูกตั้งค่าสถานะ Active และเมื่อผู้ใช้นำไปล็อกอินครั้งแรก ระบบบังคับ Redirect เข้าสู่หน้า `/change-password` ทันทีตามเงื่อนไข
    - [x] Step 4: Duplicate Email Rejection & Form Retention: แจ้งเตือนข้อผิดพลาดเมื่อใช้อีเมลซ้ำ กล่องข้อความไม่ปิด และค่าที่กรอกไว้ในฟอร์มยังคงอยู่ครบถ้วน
    - [x] Step 5: Edit User Details: สามารถแก้ไขชื่อและปรับเปลี่ยน Role เป็น Requester ได้ และตารางอัปเดต Badge ทันที
    - [x] Step 6: Administrator Self-Protection Safety Guard: เมื่อเปิด Edit บัญชีตัวเอง (Admin) ปุ่มเลือกสถานะ, Role dropdown, และปุ่ม Deactivate ถูกล็อค Disabled พร้อมมี Tooltip ป้องกันไม่ให้แอดมินปิดบัญชีตัวเอง
    - [x] Step 7: Last Active Administrator Guard: ยิง API ตรงเพื่อพยายามลดสิทธิ์ตัวเองหรือ Deactivate ตัวเอง ระบบหลังบ้านบล็อกด้วย HTTP 422 Unprocessable Entity การันตีว่าระบบจะไม่ขาดแอดมิน
    - [x] Step 8: Administrator Initial Password Reset: แอดมินสามารถรีเซ็ตรหัสผ่านเริ่มต้นให้ผู้ใช้ได้ และเมื่อผู้ใช้นำรหัสใหม่ไปล็อกอิน ระบบจะบังคับให้เปลี่ยนรหัสผ่านใหม่อีกครั้ง
    - [x] Step 9: User Deactivation & Inactive Login Prevention: สั่งปิดใช้งานบัญชีสำเร็จ และเมื่อบัญชีที่ Inactive พยายามล็อกอิน ระบบปฏิเสธด้วยข้อความที่ปลอดภัย: *"Account is inactive. Please contact your system administrator."*

    ---

    ### Suggestions เพิ่มเติมเพื่อปรับปรุง UX ให้ดียิ่งขึ้น:
    *(หมายเหตุ: ส่วนนี้เป็นข้อเสนอแนะเพิ่มเติม ไม่ได้เป็นข้อบังคับสำหรับการ Approve)*

    1. **ปุ่มเปิดดูลูกตารหัสผ่านซ้ำซ้อน (Duplicate Eye Toggle):**
       ใน Step 3 ช่องกรอกรหัสผ่านใน Drawer มีไอคอนลูกตาสำหรับกดดูรหัสผ่านซ้อนกัน 2 ปุ่มอยู่ติดกัน (น่าจะเกิดจากไอคอน Custom ของระบบ ไปซ้อนกับไอคอน Reveal Password อัตโนมัติของ Browser/Input) แนะนำให้ปรับสไตล์หรือซ่อนตัวซ้ำออกเพื่อให้ UI ดูสะอาดตาขึ้นครับ
    2. **ทางออกสำหรับผู้ใช้ในหน้า Mandatory Change Password (Exit/Sign Out Route):**
       ในกรณีที่ผู้ใช้เพิ่งล็อกอินเข้ามาครั้งแรกแล้วถูกระบบล็อกพามาที่หน้า `/change-password` ปัจจุบันหน้านี้ถูก Lock Route ไว้แน่นหนาจนไม่สามารถกดออกจากหน้านี้ได้เลย หากผู้ใช้เกิดจำรหัสผ่านชั่วคราวไม่ได้ หรือต้องการเปลี่ยนไปล็อกอินด้วยบัญชีอื่น จะไม่มีปุ่มให้กดยกเลิกหรือ Sign Out ออกมาได้เลย จึงแนะนำว่าควรมีปุ่ม "Sign Out / Cancel" เพิ่มไว้ในหน้านี้ เพื่อให้ผู้ใช้สามารถออกจาก Session นั้นและกลับไปหน้า Login ปกติได้ครับ
    3. **ความซ้ำซ้อนในการปิดบัญชีผู้ใช้ (Deactivate User Redundancy):**
       ในหน้า Edit User พบว่ามีตัวเลือกสถานะด้านบนเป็น Radio button `Active Status: (•) Yes  ( ) No` (ซึ่งถ้าเลือก No แล้วกด Save User ก็คือการ Deactivate) แต่ด้านล่างกลับมีปุ่มสีแดง `Deactivate User` แยกซ้ำเข้ามาอีกปุ่มหนึ่ง ซึ่งทั้งสองวิธีส่งผลลัพธ์เหมือนกันเป๊ะ แนะนำให้ยุบรวมเป็นรูปแบบเดียว เช่น ด้านบนแสดงเป็น Badge สถานะปัจจุบันให้อ่านอย่างเดียว แล้วใช้ปุ่มกด Deactivate ด้านล่างจัดการ เพื่อไม่ให้ผู้ใช้งานสับสนครับ
    ```

    **Partner's response:**
    ```
    Fixing.
    ```

    **Partner's response:**
    ```
    I've implemented your suggestions into the web app.
    Could you review it again?
    ```

    **My comment 2**
    ```
    - [x]  รันคำสั่ง npm test และ npx tsc --noEmit ในฝั่ง server และ client ไม่แสดง error ใด ๆ
    - [x] Step 1: Role-Based Access Control & Navigation: บัญชี IT Staff ไม่เห็นเมนูจัดการผู้ใช้ และเมื่อลองพิมพ์ URL `/admin/users` เข้าตรงๆ ถูก Route Guard สกัดและ Redirect กลับหน้า `/queue` รวมถึงยิง API ตรงได้รับ 403 Forbidden ถูกต้อง
    - [x] Step 2: User Directory, Search, and Filtering: แก้ไขคำอธิบายใน PR ให้ตรงกับหน้าเว็บเรียบร้อย โดยกดที่ปุ่ม Admin บนแถบเมนูด้านบน เพื่อเปิดเข้าหน้าจัดการผู้ใช้ (`/admin/users`) ได้ถูกต้อง สามารถกรองตามบทบาท (Role) และพิมพ์ค้นหาชื่อผู้ใช้ได้ตามปกติ
    - [x] Step 3: Create User & Mandatory Password Change: สร้างผู้ใช้ใหม่สำเร็จ บัญชีถูกตั้งค่าสถานะ Active และเมื่อผู้ใช้นำไปล็อกอินครั้งแรก ระบบบังคับ Redirect เข้าสู่หน้า `/change-password` ทันทีตามเงื่อนไข
    - [x] Step 4: Duplicate Email Rejection & Form Retention: แจ้งเตือนข้อผิดพลาดเมื่อใช้อีเมลซ้ำ กล่องข้อความไม่ปิด และค่าที่กรอกไว้ในฟอร์มยังคงอยู่ครบถ้วน
    - [x] Step 5: Edit User Details: สามารถแก้ไขชื่อและปรับเปลี่ยน Role เป็น Requester ได้ และตารางอัปเดต Badge ทันที
    - [x] Step 6: Administrator Self-Protection Safety Guard: เมื่อเปิด Edit บัญชีตัวเอง (Admin) ปุ่มเลือกสถานะ, Role dropdown, และปุ่ม Deactivate ถูกล็อค Disabled พร้อมมี Tooltip ป้องกันไม่ให้แอดมินปิดบัญชีตัวเอง
    - [x] Step 7: Last Active Administrator Guard: ยิง API ตรงเพื่อพยายามลดสิทธิ์ตัวเองหรือ Deactivate ตัวเอง ระบบหลังบ้านบล็อกด้วย HTTP 422 Unprocessable Entity การันตีว่าระบบจะไม่ขาดแอดมิน
    - [x] Step 8: Administrator Initial Password Reset: แอดมินสามารถรีเซ็ตรหัสผ่านเริ่มต้นให้ผู้ใช้ได้ และเมื่อผู้ใช้นำรหัสใหม่ไปล็อกอิน ระบบจะบังคับให้เปลี่ยนรหัสผ่านใหม่อีกครั้ง
    - [x] Step 9: User Deactivation & Inactive Login Prevention: สั่งปิดใช้งานบัญชีสำเร็จ และเมื่อบัญชีที่ Inactive พยายามล็อกอิน ระบบปฏิเสธด้วยข้อความที่ปลอดภัย: *"Account is inactive. Please contact your system administrator."*

    ---

    #### การปรับปรุงเพิ่มเติมตามข้อเสนอแนะ:
    - [x] แก้ไขไอคอนลูกตาซ้ำซ้อนในช่องรหัสผ่าน: ซ่อนไอคอนของบราวเซอร์ออกแล้ว ทำให้เหลือเฉพาะไอคอนลูกตาของระบบเพียงปุ่มเดียว ไม่ซ้อนกันอีก
    - [x] เพิ่มปุ่ม Sign Out ในหน้าบังคับเปลี่ยนรหัสผ่าน: เพิ่มปุ่ม "Sign Out / Cancel" ในหน้า `/change-password` ช่วยให้ผู้ใช้สามารถออกจากระบบได้หากลืมรหัสเดิมหรือไม่ต้องการทำรายการต่อ
    - [x] ลดความซ้ำซ้อนในการปิดบัญชีผู้ใช้: เอาตัวเลือกสถานะแบบเลือกได้ด้านบนออก แล้วเปลี่ยนเป็นแสดงแค่ข้อความสถานะให้อ่านเฉยๆ ทำให้เหลือเฉพาะปุ่มกด Deactivate ด้านล่างจุดเดียว ไม่สับสนแล้ว
    ```

    **Partner's response:**
    ```
    Feel free to merge.
    ```

### PR #40: feature/lab3-e2e-and-release
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/40
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/32
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
    - [x]  รันคำสั่ง  `npm test`และ `npx tsc --noEmit` และ ในฝั่ง server และ client ไม่แสดง error ใด ๆ และ  Playwright E2E suites ผ่านครบถ้วน
    - [x] Scenario A: Authentication & Role Redirection: ทดสอบล็อกอินรหัสผิดแสดงข้อความเตือนอย่างปลอดภัย บัญชีที่ถูกปิดใช้งานแสดงข้อความแจ้งเตือนถูกต้อง ล็อกอิน Requester (`jennifer.anderson@kmutt.ac.th`) นำทางเข้าสู่หน้า `/tickets` พร้อมแสดงชื่อและ Badge อย่างถูกต้อง และเมื่อกด Log Out แล้วกดย้อนกลับ (Browser Back) ระบบไม่อนุญาตให้เข้าถึงหน้าเดิมและดีดกลับมาหน้า Login ทันที
    - [x] Scenario B: Initial Password Login & Mandatory Password Change: ล็อกอินบัญชีใหม่ (`staff.david@toktickit.com`) ถูกระบบดักจับและบังคับ Redirect ไปที่ `/change-password` โดยพิมพ์ URL หนีไม่ได้ มีตัวเช็คความซับซ้อนของรหัสผ่าน 4 ข้อแบบ Real-time และเมื่อเปลี่ยนรหัสผ่านสำเร็จระบบจะพาเข้าสู่หน้าหลักของ IT Staff (`/queue`) ทันที
    - [x] Scenario C: IT Staff Ticket Queue & Ticket Detail Operations: ล็อกอิน IT Staff (`staff.michael@toktickit.com`) แสดงผลตารางหน้า `/queue` ครบทั้ง 8 คอลัมน์ สามารถกรองและค้นหาตั๋วได้ถูกต้อง สามารถกดรับเคส (Claim Ownership), ปรับระดับ IT Priority แยกอิสระโดยไม่กระทบ Requester Priority, เปลี่ยนสถานะเป็น Resolved พร้อมบันทึกสรุปงาน, และโพสต์ Internal Notes ในแถบสีเหลืองอำพันได้อย่างถูกต้อง
    - [x] Scenario D: Requester Anti-Leakage & Privacy Verification: ล็อกอิน Requester (`jennifer.anderson@kmutt.ac.th`) แล้วลองพิมพ์ URL เข้า `/queue` ถูกระบบบล็อกและส่งกลับหน้า `/tickets` ในหน้ารายละเอียดตั๋วมีเฉพาะแท็บ Public Comments โดยไม่มีแท็บ Internal Notes แสดงขึ้นมา และเมื่อพยายามเข้าถึงตั๋วของผู้อื่น เซิร์ฟเวอร์ตอบกลับด้วยรหัส 404 Not Found เสมอเพื่อป้องกันข้อมูลรั่วไหล
    - [x] Scenario E: Administrator User Management & Safety Guards: ล็อกอิน Administrator (`admin@toktickit.com`) สามารถสร้างผู้ใช้ใหม่ได้ ป้องกันการใช้อีเมลซ้ำโดยแสดงข้อความแจ้งเตือนและคงข้อมูลในฟอร์มไว้ครบถ้วน และมีระบบ Self-Deactivation Guard ล็อคไม่ให้แอดมินปิดบัญชีหรือปลดสิทธิ์ของตนเอง
    - [x] Scenario F: Responsive Viewports & Accessibility: ทดสอบผ่าน DevTools บนหน้าจอมือถือ (375x667px) ตารางในหน้า `/queue` และ `/admin/users` ยุบเป็นการ์ดแนวตั้ง (Stacked Cards) อัตโนมัติ ปุ่มกดและช่องกรอกมีขนาด Touch Target ได้มาตรฐาน ≥ 44px เลื่อนดูได้ลื่นไหลโดยไม่มี Scrollbar แนวนอนหลุดออกมา และแสดงผลบนแท็บเล็ต (768x1024px) ได้อย่างลงตัว
    ```

    **Partner's response:**
    ```
    I'm ready for the merge.
    ```

### PR #41: lab3-staging (release to main)
- **Link:** https://github.com/Bobbie-CPE38/TokTickIT/pull/41
- **Issue** https://github.com/Bobbie-CPE38/TokTickIT/issues/25, https://github.com/Bobbie-CPE38/TokTickIT/issues/27, https://github.com/Bobbie-CPE38/TokTickIT/issues/28, https://github.com/Bobbie-CPE38/TokTickIT/issues/29, https://github.com/Bobbie-CPE38/TokTickIT/issues/30, https://github.com/Bobbie-CPE38/TokTickIT/issues/31, https://github.com/Bobbie-CPE38/TokTickIT/issues/32, https://github.com/Bobbie-CPE38/TokTickIT/issues/34
- **Comment:** 
 **A reviewer comment was received by me:**
    **My comment 1**
    ```
     - [x] Server TypeScript (`cd server && npx tsc --noEmit`): ตรวจสอบ Type safety ฝั่ง Backend แล้ว ผ่าน 100% ไม่มี compile error (0 errors)
    - [x] Client TypeScript (`cd client && npx tsc --noEmit`): ตรวจสอบ Type safety ฝั่ง Frontend แล้ว ผ่าน 100% ไม่มี compile error (0 errors)
    - [x] Facade Limit: Server (`server/src/app.ts < 100 lines`): ตรวจสอบความยาวไฟล์ `app.ts` มีเพียง 31 บรรทัด ผ่านเกณฑ์ Thin Entry Facade
    - [x] Facade Limit: Client (`client/src/App.tsx < 80 lines`): ตรวจสอบความยาวไฟล์ `App.tsx` มีเพียง 19 บรรทัด ผ่านเกณฑ์ Thin Entry Facade
    - [x] Architectural Inward Flow (`core/` no imports from `features/`): ตรวจสอบทั้งฝั่ง server และ client แล้ว ไม่พบการ import ข้ามเลเยอร์จาก `features/` เข้ามายัง `core/` แม้แต่จุดเดียว (Zero forbidden imports)
    - [x] Lab 2 Regression (`server/tests/lab-02/`): รันชุดทดสอบย้อนหลังของ Lab 2 ผ่านครบ 43/43 tests ไม่มี regression ต่อฟังก์ชันเดิม
    - [x] Lab 3 API Suites (`server/tests/lab-03/*.api.test.ts`): รันชุดทดสอบ API ทั้งหมดของ Lab 3 ผ่านครบถ้วน 54/54 tests
    - [x] Client Unit Suites (`client/tests/lab-03/*.test.tsx`): รันชุดทดสอบ UI components ของ Lab 3 ผ่านครบถ้วน 40/40 tests
    - [x] E2E Playwright (`e2e/lab-03/*.spec.ts`): ชุดทดสอบ End-to-End ผ่านครบ **43/43 tests** รองรับทุกเบราว์เซอร์และทุกขนาดหน้าจอ (Desktop, Tablet, Mobile)
    - [x] Admin Safety Guards (BR-16 & BR-17 return HTTP 422): ทดสอบยิง API เพื่อพยายามลดสิทธิ์หรือ Deactivate บัญชี Admin ตัวเอง ระบบบล็อกและตอบกลับด้วย HTTP 422 Unprocessable Entity ถูกต้อง
    - [x] Anti-Leakage Privacy (Cross-requester queries return HTTP 404): ทดสอบใช้บัญชี Requester ขอดึงข้อมูลตั๋วของผู้อื่น ระบบตอบกลับด้วย HTTP 404 Not Found เสมอเพื่อป้องกันข้อมูลรั่วไหล
    ```

    **Partner's response:**
    ```
    Thanks for all the effort you put there.
    ```
