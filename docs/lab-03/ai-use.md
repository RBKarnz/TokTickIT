# Lab 3 — AI Use and Reflection

**LLM/agent used:** Claude 3.7 Sonnet / Claude Opus 4.6 & Google Gemini 3.8 (Antigravity Agentic Pair Programmer)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result | Reflection |
|---|---------------------|----------------------------|------------|
| 1 | Help map out permissions and boundaries for Requester, IT Staff, and Admin so roles do not overlap. | Used the role breakdown to set up route guards and API checks. | Helped me clearly understand how each role operates differently, especially what requesters should never be allowed to access. |
| 2 | How to add new user models for Lab 3 without breaking existing Lab 2 tests that use @kmutt.ac.th emails? | Created a seed script separating @kmutt and @toktickit accounts. | Taught me how real projects maintain backward compatibility so new schema changes do not break legacy test suites. |
| 3 | Write route guards and middleware to force users to change their password on first login before doing anything else. | Added checks in App.tsx and session auth middleware. | Showed me how restricted sessions work in practice to stop users from staying on default temporary passwords. |
| 4 | Should accessing another user's ticket return 403 or 404, and how to implement it safely? | Configured the ticket route handler to return 404 Not Found. | Learned that returning 403 leaks that the ticket exists. Returning 404 is much safer because attackers cannot guess valid ticket IDs. |
| 5 | Build a ticket queue table for Staff with search, status filters, and pagination that works on mobile. | Implemented StaffTicketQueuePage using stacked cards on small screens. | Realized desktop tables break completely on phones, so learning to switch to card layouts with proper tap targets was very practical. |
| 6 | Write ticket update logic so staff can only move tickets to allowed next statuses and must enter a resolution note before closing. | Added status transition checks and modal dialogs in TicketDetailPage. | Helped me understand state machines and how to stop staff from closing tickets without documenting what was actually fixed. |
| 7 | How to prevent an admin from deactivating their own account or deleting the last admin in the system? | Added backend checks returning 422 before updating user status. | Made me think about human error and edge cases that could accidentally lock everyone out of the system forever. |
| 8 | Playwright test fails randomly because it clicks a row before filtered tickets finish loading. | Replaced waitForTimeout with waitForResponse for the API call. | Learned that hardcoded sleep times make tests flaky, and real E2E tests need to wait on actual network responses. |

## Reflection
- **Understanding Multi-Role Boundaries:** Moving past simple CRUD to understand how Requester, IT Staff, and Admin actually interact. Each role has strict operational limits—like keeping internal notes hidden from requesters, letting staff adjust internal priority without modifying requested priority, and preventing requesters from changing ticket status directly.
- **Security & Privacy in Practice:** A major eye-opener was learning about real vulnerabilities, especially why accessing another user's ticket must return 404 instead of 403 to prevent ID enumeration. Forcing temporary password changes on first login also showed how restricted sessions protect newly provisioned accounts.
- **Defensive Business Logic:** Learning to think through edge cases before they break the system, such as writing safety guards to stop admins from deactivating themselves or locking out the last remaining admin, and requiring resolution notes before allowing tickets to close.
- **Real-World Testing Over Guesswork:** Writing Playwright E2E tests taught me that hardcoded `waitForTimeout` timers cause flaky tests when network speed varies. Replacing them with explicit API response listeners (`waitForResponse`) made tests stable and reflected actual user flow.
- **Working with AI as a Copilot:** While the AI sped up writing boilerplate routes and Bootstrap layouts, I could not just blindly accept its code. I had to actively catch business rule mismatches myself and debug failing integration tests to make sure everything actually worked together properly.
