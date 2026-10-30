# Lab 3 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini), Claude

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result | Reflection |
|---|---------------------|----------------------------|------------|
| 1 | Help map out permissions and boundaries for Requester, IT Staff, and Admin so roles do not overlap. | Used the role breakdown to set up route guards and API checks. | Helped me clearly understand how each role operates differently, especially what requesters should never be allowed to access. |
| 2 | How to migrate the Lab 2 Development Requesters into real user accounts for Lab 3 without losing existing tickets and attachments? | Wrote the Lab 3 migration and an idempotent seed that map each legacy requester email (e.g. jennifer.a@example.com) to a Lab 3 account (requester1@toktickit.com) while keeping user IDs, tickets, and attachments. | Taught me how real projects evolve a schema and migrate existing data safely, so tickets from the previous sprint are preserved instead of recreated. |
| 3 | Write route guards and middleware to force users to change their password on first login before doing anything else. | Added checks in App.tsx and session auth middleware. | Showed me how restricted sessions work in practice to stop users from staying on default temporary passwords. |
| 4 | Should accessing another user's ticket return 403 or 404, and how to implement it safely? | Configured the ticket route handler to return 404 Not Found. | Learned that returning 403 leaks that the ticket exists. Returning 404 is much safer because attackers cannot guess valid ticket IDs. |
| 5 | Build a ticket queue table for Staff with search, status filters, and pagination that works on mobile. | Implemented StaffTicketQueuePage using stacked cards on small screens. | Realized desktop tables break completely on phones, so learning to switch to card layouts with proper tap targets was very practical. |
| 6 | Write ticket update logic so staff can only move tickets to allowed next statuses and must enter a resolution summary when resolving a ticket. | Added status transition checks (409 Conflict for invalid transitions) and confirmation modals in TicketDetailPage. | Helped me understand state machines and how to stop staff from resolving tickets without documenting what was actually fixed. |
| 7 | How to prevent an admin from deactivating their own account or deleting the last admin in the system? | Added backend checks returning 409 Conflict before updating user status. | Made me think about human error and edge cases that could accidentally lock everyone out of the system forever. |
| 8 | Playwright test fails randomly because it clicks a row before filtered tickets finish loading. | Added waitForResponse on the staff queue API call after applying the status filter (visual-screenshots.spec.ts). | Learned that hardcoded sleep times make tests flaky, and E2E tests should wait on actual network responses. Some short fixed waits, such as the search debounce, are still used in other specs. |

## My Reflection

### Specification agent
- **Security choices need a reason.** I worked with the agent to choose the session design and justify it: a server-side session with an opaque `HttpOnly` cookie, only a hash of the token stored on the server, Argon2id password hashing, and 8-hour idle / 24-hour absolute timeouts. I learned why each choice exists: `HttpOnly` keeps the token away from JavaScript (XSS), and a stored hash means a leaked database does not hand out live sessions.
- **Hiding a button is not access control.** Building the authorization matrix showed me that every rule must be enforced by the backend, for example Requesters never see Internal Notes, and an Administrator does not get IT Staff ticket operations by default. The UI only gives feedback.
- **An AI-written spec can contradict itself.** My peer reviewer found that Internal Notes were visible to Administrators in one section and IT Staff only in another, and that the password rule (12-128 characters) did not match the UI mockup (8+ characters with complexity). I learned to check the spec against the lab sheet and against itself before coding, because the tests and code inherit every contradiction.

### Coding agent
- **The agent drifts from the spec unless something checks it.** Reviews found generated code that broke the contract: the session token was not rotated after a password change, a client-only password rule ("no more than 5 identical characters") appeared that no spec asked for, and the Internal Notes routes were outside the `/staff` path. I learned to compare code to the spec line by line, not only to check that it runs.
- **Small responses can leak information.** Returning 403 for another user's ticket confirms the ticket exists; 404 does not, so attackers cannot guess valid IDs (BR-20). I also learned that a security change must update its tests and docs together: an E2E test still expected 403 after the switch and failed in the release PR.
- **Data work needs its own checks.** The first migration left old tickets with IT Priority `UNASSIGNED`, and the seed created only 5 of the 8 statuses. I learned that a migration must be tested against existing data, and that seed data must cover every state I want to test.

**Overall:** The agent saved time on boilerplate, but the test plan written before coding and the peer review caught what it missed. I need to understand rules like session handling and 404 vs 403 well enough to judge its output myself.
