# Lab 3 REST API Specification

## 1. API Conventions

Base path: `/api`

All JSON request/response bodies use UTF-8 JSON unless a Lab 2 endpoint already defines another representation.

All protected endpoints require a valid server-side session unless explicitly marked otherwise.

Authentication uses an opaque session token in an `HttpOnly` cookie. The server stores only a hash of the token.

Production/security settings:
- `HttpOnly=true`
- `Secure=true` outside local HTTP development
- `SameSite=Lax`
- `Path=/`
- no session token in localStorage/sessionStorage
- no session token in URLs
- no credential/session token logging

Session expiration:
- 8 hours inactivity;
- 24 hours absolute;
- logout/revocation invalidates immediately.

Mutating requests MUST enforce the application's CSRF defense: same-origin Origin validation plus the CSRF mechanism selected by the existing application architecture.

JSON errors use:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Safe human-readable message",
    "fieldErrors": {
      "fieldName": "Safe field-level message"
    }
  }
}
```

`fieldErrors` is optional.

Never return:
- passwordHash;
- raw session token;
- initial password after creation;
- internal stack traces;
- secret configuration;
- another user's protected resource existence.

## 2. Standard Status Semantics

- `200 OK` — successful retrieval/update.
- `201 Created` — successful creation.
- `204 No Content` — successful logout when no body is needed.
- `400 Bad Request` — malformed request/query.
- `401 Unauthorized` — missing/invalid/expired authentication.
- `403 Forbidden` — authenticated but not permitted, including first-login restricted access.
- `404 Not Found` — resource not available to the caller; for protected ownership resources this may be used to avoid existence disclosure.
- `409 Conflict` — uniqueness or state/version conflict.
- `422 Unprocessable Entity` — semantically invalid field values where the existing API convention uses 422.
- `500 Internal Server Error` — unexpected failure with safe generic message only.

Do not use `200` for business-operation failure.

## 3. Authentication

### POST `/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "current-password"
}
```

Rules:
- email normalized as defined in the business rules;
- password validated against stored hash;
- inactive users denied;
- response is safe and non-enumerating.

Success response for normal user:

```json
{
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "REQUESTER"
  },
  "mustChangePassword": false
}
```

Success response for initial-password user:

```json
{
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "REQUESTER"
  },
  "mustChangePassword": true
}
```

The login session for `mustChangePassword=true` MUST be restricted to password-change/current-user/logout operations.

Failure:
- bad credentials/inactive account: `401`;
- malformed fields: `400` or `422`;
- safe generic message.

### POST `/auth/logout`

Auth required.

Effect:
- revoke current session;
- clear session cookie.

Response: `204`.

Calling logout without a valid authenticated session may safely return `204`.

### GET `/auth/me`

Auth required.

Returns only safe user fields:

```json
{
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```

A forced-password-change session returns the same identity plus `mustChangePassword=true`, but normal application data remains forbidden.

### POST `/auth/change-password`

Auth required; may be called by a forced first-login session.

Request:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password",
  "confirmPassword": "new-password"
}
```

Rules:
- currentPassword required and verified against current user hash;
- 8–128 chars, must include uppercase, lowercase, number, and special character;
- outer whitespace normalized according to password policy;
- new password differs from current;
- confirmation matches;
- hash stored;
- `mustChangePassword=false`;
- old sessions invalidated as required by the implementation;
- current restricted session is rotated to a normal authenticated session.

Success: `200`.

Never return password material.

## 4. Requester Ticket APIs

These endpoints continue Lab 2 contracts where possible. The critical Lab 3 rule is that requester identity comes from the authenticated session.

### POST `/tickets`

Role: Requester.

Do NOT accept a trusted `requesterId` field. If a legacy payload contains one, the server MUST ignore or reject it according to the existing Lab 2 compatibility decision, but it MUST never use it as the source of ownership.

On creation:
- requester/user ID comes from authenticated session;
- Requested Priority remains as submitted;
- IT Priority initializes from Requested Priority if no explicit Lab 2-compatible value exists;
- status initializes according to existing Lab 2 behavior or `New` if the existing system has no other required initial state.

### GET `/tickets`

Role: Requester.

Returns only Tickets owned/submitted by the authenticated Requester.

### GET `/tickets/:ticketId`

Role: Requester.

Returns only an owned Ticket. If not owned, use safe `404` behavior.

### Existing Ticket update/Attachment endpoints

Preserve Lab 2 endpoint semantics except:
- Requester ownership MUST be derived server-side from authentication;
- direct requesterId override is prohibited;
- Internal Notes are never included;
- Lab 3 additions must be additive.

### POST `/tickets/:ticketId/public-comments`

Roles:
- Requester: only own Ticket.
- IT Staff: any Ticket permitted by Staff workflow.

Request:

```json
{
  "content": "The issue is still happening."
}
```

Rules:
- trim before validation;
- reject empty/whitespace-only;
- maximum 4000 chars;
- append-only.

Response `201`:

```json
{
  "comment": {
    "id": "uuid",
    "ticketId": "uuid",
    "author": {
      "id": "uuid",
      "name": "Author"
    },
    "content": "The issue is still happening.",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

Author and timestamp are server-derived.

### GET `/tickets/:ticketId/public-comments`

Roles:
- Requester: own Ticket only.
- IT Staff: permitted Staff Ticket.
- Administrator: only when the Administrator is otherwise authorized to view the relevant Ticket by the approved authorization matrix.

Response contains only Public Comments.

### POST `/tickets/:ticketId/problem-appears-resolved`

Role: Requester, own Ticket only.

No request body required.

Effect:
- set first `requesterResolvedAt` timestamp if not already set;
- do not change formal Ticket status.

Response `200`:

```json
{
  "ticketId": "uuid",
  "requesterResolvedAt": "2026-01-01T00:00:00Z"
}
```

## 5. IT Staff Queue

### GET `/staff/tickets`

Role: IT Staff.

Query parameters:

- `search` — optional string, Ticket Number or Summary.
- `status` — optional one status.
- `requestedPriority` — optional one priority.
- `itPriority` — optional one priority.
- `ownership` — optional `assigned|unassigned`.
- `ownerId` — optional active/inactive owner ID; server validates authorization.
- `sortBy` — `createdAt|updatedAt|requestedPriority|itPriority|status|ticketNumber|category|owner`.
- `sortOrder` — `asc|desc`.
- `page` — positive integer, default `1`.
- `pageSize` — `10|20|50`, default `20`.

Default sort: `updatedAt desc`, then `ticketNumber desc`.

Invalid query values: `400`.

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "ticketNumber": "TCK-000123",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z",
      "summary": "Cannot connect",
      "category": "Network",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "status": "In Progress",
      "owner": {
        "id": "uuid",
        "name": "Staff User"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

No Internal Notes or sensitive credentials appear.

## 6. IT Staff Ticket Detail

### GET `/staff/tickets/:ticketId/attachments`

Roles: IT Staff, Administrator (only where authorized to view the Ticket).

Returns all attachments associated with the ticket, including active and soft-removed metadata for operational auditing.

### GET `/staff/attachments/:attachmentId/download`

Roles: IT Staff, Administrator (only where authorized to view the Ticket).

Downloads an active attachment file. Soft-removed attachments return `404 Not Found` or `410 Gone`.

### GET `/staff/tickets/:ticketId`

Role: IT Staff.

Returns:
- Ticket fields;
- requester-safe identity fields;
- owner;
- Requested Priority;
- IT Priority;
- status;
- resolutionSummary (nullable string explaining resolution, visible to requester and staff);
- Attachment data allowed by Lab 2;
- Public Comments;
- Internal Notes;
- requesterResolvedAt.

Internal Notes are visible because this specification authorizes IT Staff only.

For missing/unauthorized Ticket: `404` or `403` according to established non-enumeration policy; must not leak protected existence. Administrator access is not implied merely by having the Administrator role.

### POST `/staff/tickets/:ticketId/claim`

Role: IT Staff.

Effect:
- assigns owner to authenticated IT Staff user;
- rejects if Ticket is already claimed unless the endpoint is defined as an idempotent self-claim. This specification chooses: reject with `409` if owned by another user.

Success `200` returns updated owner.

### PUT `/staff/tickets/:ticketId/owner`

Role: IT Staff.

Request:

```json
{
  "ownerId": "uuid"
}
```

Rules:
- target must be active IT Staff;
- `null` may be used only through an explicit unassign action if implementation needs it. This specification does NOT require an unassign feature, so ordinary update requires a valid active IT Staff target.
- returns `409` on detected stale-state conflict where applicable.

### PATCH `/staff/tickets/:ticketId/it-priority`

Role: IT Staff.

Request:

```json
{
  "itPriority": "LOW"
}
```

Server validates enum and persists independently of Requested Priority.

### POST `/staff/tickets/:ticketId/status`

Role: IT Staff.

Request:

```json
{
  "status": "Resolved",
  "resolutionSummary": "Replaced faulty RAM module on motherboard and verified memory test pass."
}
```

Server checks exact current-to-next transition matrix and refuses invalid transitions.

Required matrix:

- New -> Open, Cancelled
- Open -> In Progress, Waiting for Requester, Cancelled
- In Progress -> Waiting for Requester, Resolved, Cancelled
- Waiting for Requester -> In Progress, Resolved, Cancelled
- Resolved -> Closed, Reopened
- Closed -> Reopened
- Reopened -> In Progress, Waiting for Requester, Resolved, Cancelled
- Cancelled -> none

UI confirmation does not replace backend validation.

## 7. Internal Notes

### POST `/staff/tickets/:ticketId/internal-notes`

Roles: IT Staff, Administrator (authorized for operational notes).

Request:

```json
{
  "content": "Investigating switch port configuration."
}
```

Validation:
- trimmed;
- non-empty;
- max 4000 chars;
- append-only.

Response `201` includes author/timestamp and content only for authorized IT Staff.

### GET `/staff/tickets/:ticketId/internal-notes`

Roles:
- IT Staff: permitted Staff Ticket.
- Administrator: authorized to view read-only Internal Notes for relevant tickets as defined by BR-04.

Returns Internal Notes only. Never include these in Requester responses.

## 8. Administrator User Management

### GET `/admin/users`

Role: Administrator only.

Query:
- `search` optional; matches name or email.
- `role` optional one of three valid roles.

No pagination required.
No multi-column sorting.
No multiple simultaneous role filters.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Example User",
      "email": "example@example.com",
      "role": "REQUESTER",
      "isActive": true
    }
  ]
}
```

Never expose password hashes or session data.

### POST `/admin/users`

Role: Administrator.

Request:

```json
{
  "name": "Example User",
  "email": "example@example.com",
  "role": "REQUESTER",
  "isActive": true,
  "initialPassword": "local-initial-password",
  "confirmInitialPassword": "local-initial-password"
}
```

Rules:
- one valid role;
- unique canonical email;
- valid initial password policy (8–128 characters, uppercase, lowercase, number, special character);
- stores password hash only;
- sets `mustChangePassword=true`;
- never returns initial password after the response.

Response `201`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Example User",
    "email": "example@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  }
}
```

### PATCH `/admin/users/:userId`

Role: Administrator.

Request may contain:
- `name`
- `email`
- `role`
- `isActive`

Rules:
- email canonicalized and unique;
- role exactly one permitted role;
- self-deactivation rejected;
- deactivation or changing the role away from ADMINISTRATOR of the last active Administrator is rejected with 409 Conflict;
- activating/deactivating a user does not delete data;
- when a user becomes inactive, their active sessions are revoked.

Response `200`: safe user representation.

### POST `/admin/users/:userId/set-initial-password`

Role: Administrator.

Request:

```json
{
  "initialPassword": "new-initial-password",
  "confirmInitialPassword": "new-initial-password"
}
```

Effect:
- hash and store;
- `mustChangePassword=true`;
- revoke all existing sessions for target user.

Response `200` contains safe user state only.

## 9. Authorization / Safe Error Table

| Situation | Status | Requirement |
|---|---:|---|
| No/invalid session | 401 | No protected data |
| Authenticated wrong role | 403 | Safe generic message |
| Requester accesses another user's Ticket | 404 preferred | No existence disclosure |
| Requester calls Internal Notes | 403 or 404 | No note data |
| Duplicate email | 409 | Safe conflict message |
| Invalid role | 422 | Safe field error |
| Invalid status transition | 409 | No state mutation |
| Inactive owner assignment | 422 | No state mutation |
| Self-deactivation | 409 | No state mutation |
| Last active Administrator deactivation | 409 | No state mutation |
| Last active Administrator role demotion | 409 | No state mutation |
| Invalid queue query | 400 | Safe query error |
| Missing Ticket for authorized Staff route | 404 | No sensitive detail |
| Unexpected server failure | 500 | Generic safe message |

## 10. Concurrency / Integrity

- Ticket mutations MUST be based on current persisted state.
- Status transition endpoints MUST reject invalid transitions if the Ticket changed between read and write.
- Ownership changes MUST not silently overwrite another concurrent claim.
- Database constraints MUST enforce unique email.
- Multi-step Administrator safety operations MUST execute transactionally so the system cannot end in a state with zero active Administrators.
- User deactivation/session revocation and password reset/session revocation MUST be transactionally consistent.

## 11. API Security Requirements

- No password storage in plaintext.
- No credentials/session tokens in logs.
- No credential data in API errors.
- No client-authoritative ownership.
- Backend authorization on every protected endpoint.
- No trust in hidden/disabled UI.
- Parameterized ORM/database access; no unsafe string-built SQL.
- Input validation at API boundary.
- Text content rendered safely by the client.
- No raw HTML execution from comments/notes.
- Secrets only through environment/configuration.
- Tests MUST call API endpoints directly for authorization checks, bypassing the UI.
