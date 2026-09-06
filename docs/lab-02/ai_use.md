# Lab 2 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result | Reflection |
|---|---------------------|----------------------------|------------|
| 1 | Help implement the file upload API | Integrated multer into Express backend | The AI provided a complete multer configuration with size limits and file counts, which saved a lot of time compared to writing the boilerplate from scratch. |
| 2 | Refactor My Tickets pagination | Applied the generated sliding-window pagination UI | Instead of manually calculating page ranges and edge cases, the AI generated a clean sliding-window logic that was easy to plug into the existing React state. |
| 3 | How to handle soft-remove DB schema? | Added isRemoved boolean to Prisma schema | The AI suggested a simple boolean flag approach. This was a non-destructive way to handle file deletions that perfectly matched the lab's business rules. |
| 4 | Fix mobile UI issue on navbar | Removed Bootstrap collapse class on profile dropdown | The AI quickly identified that the Bootstrap collapse class was hiding the profile switcher on mobile viewports. A very fast and precise UI fix. |
| 5 | Create custom modal for removal reason | Copied the Bootstrap modal markup and wired state | Writing Bootstrap modal markup manually can be tedious. The AI generated the HTML structure and the necessary React state handlers in one go. |
| 6 | Sort attachments chronologically | Applied the sorting logic in TicketDetailPage | The AI provided a precise JavaScript .sort() function comparing the createdAt timestamps, ensuring new files stay on top and removed files stay at the bottom. |

## Reflection

- **Accelerated Development:** The AI massively sped up the development process by generating boilerplate code for API routes, Prisma schemas, and complex Bootstrap UI components. This allowed me to focus more on integrating the pieces and testing the business logic rather than typing out repetitive syntax.
- **State Management Risks:** While the AI is great at generating components, it requires careful review when dealing with React hooks. There were instances where the generated useEffect dependencies were incorrect, causing infinite loops that I had to debug and fix manually.
- **Maintaining Project Context:** A major lesson learned is that the AI can lose track of the project's overall context. If not given strict instructions, it sometimes attempted to overwrite or delete existing working code (e.g., files from Lab 1). Constantly reviewing the diffs and using Git for version control was essential to prevent regressions.
