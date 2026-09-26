# Lab 4 REST API Specification

## 1. Conventions (carried from Lab 3)

- **Base URL:** `/api`
- **Transport & Format:** HTTPS (HTTP for local development), JSON payloads for requests and responses.
- **Authentication:** Established via HTTP-only, SameSite session cookie named `session_token`.
- **CSRF Protection:** Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) with an active session must include a valid `X-CSRF-Token` header and come from an allowed `Origin` or `Referer`.
- **Unified Error Envelope:** All 4xx and 5xx responses conform to:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable explanation",
      "fieldErrors": {
        "fieldName": "Specific validation message"
      },
      "details": ["Optional list of fine-grained violations"],
      "current": {}
    }
  }
  ```
  The `current` object is included on `409 STALE_UPDATE` conflicts to return the freshest persisted record.

## 2. Status and Error Semantics

| HTTP Status | Error Code | Meaning / Scenario |
|---|---|---|
| `200 OK` | — | Successful query, idempotent replay, or successful update |
| `201 Created` | — | Successful creation of a new entity |
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON, invalid query parameter types, or illegal values |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid session token |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks required role, or CSRF verification failed |
| `404 Not Found` | `NOT_FOUND` | Target entity does not exist, or unowned resource (safe non-disclosure) |
| `409 Conflict` | `STALE_UPDATE` | Optimistic locking conflict: client `expectedVersion` does not match server version |
| `409 Conflict` | `ACTION_CLOSED` | Attempted edit or state change on an action in terminal status (`COMPLETED` or `CANCELLED`) |
| `409 Conflict` | `RESOLUTION_GATE` | Ticket transition to `RESOLVED` rejected because resolution conditions are not met |
| `409 Conflict` | `CONFLICT` | Invalid status transition outside permitted matrix, or action added to closed/cancelled ticket |
| `422 Unprocessable` | `VALIDATION_ERROR` | Schema or semantic validation failure (e.g. missing follow-up note, inactive assignee) |
| `500 Server Error` | `INTERNAL_ERROR` | Unexpected server exception; no internal stack traces leaked |

## 3. Actions Taken

### 3.1 List Actions Taken for Ticket

- **Endpoint:** `GET /api/tickets/:ticketId/actions`
- **Authorized Roles:** `REQUESTER` (own tickets only), `IT_STAFF`, `ADMINISTRATOR`
- **Ordering:** Strictly ordered by `actionAt ASC, id ASC` (stable chronological order)
- **Response:** `200 OK`
  ```json
  {
    "items": [
      {
        "id": 101,
        "ticketId": 42,
        "actionAt": "2026-09-26T10:15:00.000Z",
        "description": "Replaced faulty Cat6 patch cable and tested link speed.",
        "result": "Link negotiated at 1 Gbps with zero packet loss.",
        "status": "COMPLETED",
        "followUpRequired": false,
        "followUpNote": null,
        "attachmentNotes": "Refer to cable_tester_cert.png attached to ticket.",
        "performedBy": {
          "id": 2,
          "name": "Michael Staff"
        },
        "assignedTo": {
          "id": 2,
          "name": "Michael Staff",
          "email": "michael.staff@toktick.it"
        },
        "version": 1,
        "createdAt": "2026-09-26T10:16:12.000Z",
        "updatedAt": "2026-09-26T10:20:00.000Z"
      }
    ]
  }
  ```
- **Errors:**
  - `401 UNAUTHORIZED`: No session.
  - `404 NOT_FOUND`: Ticket does not exist or owned by another Requester (no disclosure).

### 3.2 Create Action Taken

- **Endpoint:** `POST /api/tickets/:ticketId/actions`
- **Authorized Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Headers:**
  - `Idempotency-Key` (Optional, 1–100 chars): Protects against duplicate submits.
- **Request Body:**
  ```json
  {
    "actionAt": "2026-09-26T10:15:00.000Z",
    "description": "Inspecting network drop in room 402.",
    "result": null,
    "assignedToId": 2,
    "status": "IN_PROGRESS",
    "followUpRequired": true,
    "followUpNote": "Need to order 50m replacement spool if cable is severed.",
    "attachmentNotes": "Check floor plan attachment."
  }
  ```
- **Validation Rules:**
  - `actionAt`: Optional, ISO-8601 string, defaults to current time. Must not exceed server time + 5 minutes.
  - `description`: Required, trimmed 1–2000 chars.
  - `result`: Optional string ≤ 2000 chars; required if `status` is `COMPLETED`.
  - `assignedToId`: Required integer; must reference an active `IT_STAFF` or `ADMINISTRATOR` user.
  - `status`: Optional enum (`PLANNED`, `IN_PROGRESS`, `COMPLETED`), defaults to `PLANNED`.
  - `followUpRequired`: Boolean, defaults to `false`.
  - `followUpNote`: Required (1–1000 chars) if `followUpRequired` is `true`; must be `null` or omitted when `false`.
  - `attachmentNotes`: Optional string ≤ 1000 chars.
- **Response:**
  - `201 Created` for a newly created action.
  - `200 OK` with header `Idempotent-Replay: true` if an action with the same `Idempotency-Key` already exists for this ticket.
- **Errors:**
  - `403 FORBIDDEN`: Requester role, or invalid CSRF.
  - `404 NOT_FOUND`: Ticket not found.
  - `409 CONFLICT`: Ticket is in terminal status (`CLOSED` or `CANCELLED`).
  - `422 VALIDATION_ERROR`: Field validation failure or inactive/non-staff assignee.

### 3.3 Update Action Taken

- **Endpoint:** `PATCH /api/actions/:actionId`
- **Authorized Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "description": "Updated cable replacement progress notes.",
    "result": "Cable replaced successfully.",
    "status": "COMPLETED",
    "assignedToId": 3,
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "See test report.",
    "expectedVersion": 1
  }
  ```
- **Validation & OCC Rules:**
  - `expectedVersion`: Required integer. If does not match current DB version -> `409 STALE_UPDATE`.
  - Cannot update an action whose current status is already `COMPLETED` or `CANCELLED` -> `409 ACTION_CLOSED`.
  - Status transition must follow Action Status Matrix (`PLANNED` -> `IN_PROGRESS`/`COMPLETED`/`CANCELLED`; `IN_PROGRESS` -> `COMPLETED`/`CANCELLED`) -> `409 CONFLICT`.
  - Setting status to `COMPLETED` requires a non-empty `result` string -> `422 VALIDATION_ERROR`.
  - `assignedToId`: If changed, must reference an active `IT_STAFF` or `ADMINISTRATOR` -> `422 VALIDATION_ERROR`.
- **Response:** `200 OK` returning updated action object with incremented `version`.
- **Errors:**
  - `403 FORBIDDEN`: Requester role, or invalid CSRF.
  - `404 NOT_FOUND`: Action not found.
  - `409 STALE_UPDATE`: Version mismatch; returns current action in `error.current`.
  - `409 ACTION_CLOSED`: Action is already in terminal state.
  - `409 CONFLICT`: Illegal action status transition.
  - `422 VALIDATION_ERROR`: Validation rule violation.

## 4. Ticket Workflow

### 4.1 Update Ticket Status (Enhanced)

- **Endpoint:** `POST /api/staff/tickets/:ticketId/status` (and alias `PATCH /api/tickets/:ticketId/status`)
- **Authorized Roles:** `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Ethernet drop replaced and verified at 1 Gbps.",
    "reason": "Completed work after physical cable replacement.",
    "expectedVersion": 2
  }
  ```
- **Business Logic & Guards:**
  - Transition must exist in Final Ticket Status Matrix -> `409 CONFLICT`.
  - If `expectedVersion` is provided and does not match `Ticket.version` -> `409 STALE_UPDATE`.
  - If target status is `RESOLVED`, evaluate **Resolution Gate**:
    1. `resolutionSummary` must be non-empty after trimming -> `RESOLUTION_SUMMARY_REQUIRED`.
    2. Ticket must have at least one Action Taken with status `COMPLETED` -> `COMPLETED_ACTION_REQUIRED`.
    3. Ticket must have zero Actions Taken with `followUpRequired = true` and status `PLANNED` or `IN_PROGRESS` -> `PENDING_FOLLOW_UP`.
    - If any gate condition fails -> `409 RESOLUTION_GATE` with `error.details` array containing the failed identifiers.
  - In a single database transaction:
    1. Update Ticket status, `resolutionSummary`, increment `version`, update `updatedAt`.
    2. Insert row into `TicketStatusHistory` with `fromStatus`, `toStatus`, `changedById = sessionUser.id`, `reason`.
- **Response:** `200 OK`
  ```json
  {
    "ticketId": 42,
    "currentStatus": "RESOLVED",
    "resolutionSummary": "Ethernet drop replaced and verified at 1 Gbps.",
    "version": 3,
    "history": [
      {
        "id": 12,
        "fromStatus": "IN_PROGRESS",
        "toStatus": "RESOLVED",
        "changedBy": { "id": 2, "name": "Michael Staff" },
        "reason": "Completed work after physical cable replacement.",
        "createdAt": "2026-09-26T11:00:00.000Z"
      }
    ]
  }
  ```
- **Errors:**
  - `401 UNAUTHORIZED`: No session.
  - `403 FORBIDDEN`: Requester role, or invalid CSRF.
  - `404 NOT_FOUND`: Ticket not found.
  - `409 RESOLUTION_GATE`: Gate check failed.
  - `409 STALE_UPDATE`: Version mismatch.
  - `409 CONFLICT`: Forbidden transition.

### 4.2 Get Ticket Status History

- **Endpoint:** `GET /api/tickets/:ticketId/status-history`
- **Authorized Roles:** `REQUESTER` (own tickets), `IT_STAFF`, `ADMINISTRATOR`
- **Response:** `200 OK`
  ```json
  {
    "items": [
      {
        "id": 1,
        "fromStatus": null,
        "toStatus": "NEW",
        "changedBy": null,
        "reason": "Backfilled from migration",
        "createdAt": "2026-09-20T08:00:00.000Z"
      },
      {
        "id": 5,
        "fromStatus": "NEW",
        "toStatus": "OPEN",
        "changedBy": { "id": 2, "name": "Michael Staff" },
        "reason": "Claimed by staff",
        "createdAt": "2026-09-21T09:12:00.000Z"
      }
    ]
  }
  ```
- **Ordering:** Strictly ordered by `createdAt ASC, id ASC`.
- **Immutability:** No `POST`, `PUT`, `PATCH`, or `DELETE` endpoints exist for history records (404/405).

## 5. Dashboards

### 5.1 Requester Dashboard

- **Endpoint:** `GET /api/dashboard/requester`
- **Authorized Roles:** `REQUESTER` only (IT_STAFF and ADMINISTRATOR receive `403 FORBIDDEN`).
- **Response:** `200 OK`
  ```json
  {
    "openTickets": { "count": 3, "drillDown": "/tickets?statusGroup=open" },
    "waitingForMe": { "count": 1, "drillDown": "/tickets?status=WAITING_FOR_REQUESTER" },
    "resolved": { "count": 5, "drillDown": "/tickets?status=RESOLVED" },
    "closed": { "count": 12, "drillDown": "/tickets?status=CLOSED" },
    "recentlyUpdated": [
      {
        "id": 42,
        "ticketNumber": "TKT-2026-000042",
        "summary": "Laptop battery drains quickly",
        "status": "IN_PROGRESS",
        "updatedAt": "2026-09-26T10:15:00.000Z"
      }
    ],
    "recentlyResolved": [
      {
        "id": 38,
        "ticketNumber": "TKT-2026-000038",
        "summary": "VPN disconnects randomly",
        "status": "RESOLVED",
        "updatedAt": "2026-09-25T14:30:00.000Z"
      }
    ],
    "generatedAt": "2026-09-26T11:05:00.000Z",
    "timeZone": "Asia/Bangkok"
  }
  ```

### 5.2 IT Staff and Administrator Dashboard

- **Endpoint:** `GET /api/dashboard/staff`
- **Authorized Roles:** `IT_STAFF`, `ADMINISTRATOR` (REQUESTER receives `403 FORBIDDEN`).
- **Response:** `200 OK`
  ```json
  {
    "unassigned": { "count": 14, "drillDown": "/staff/queue?ownership=unassigned&statusGroup=open" },
    "myOwnedOpen": { "count": 16, "drillDown": "/staff/queue?ownerId=me&statusGroup=open" },
    "myOpenActions": { "count": 5, "drillDown": "/staff/queue?actionAssignee=me" },
    "pendingFollowUps": { "count": 2, "drillDown": "/staff/queue?followUp=pending" },
    "byStatus": {
      "NEW": 14,
      "OPEN": 23,
      "IN_PROGRESS": 18,
      "WAITING_FOR_REQUESTER": 7,
      "RESOLVED": 10,
      "CLOSED": 45,
      "REOPENED": 2,
      "CANCELLED": 4
    },
    "byItPriority": {
      "LOW": 12,
      "MEDIUM": 28,
      "HIGH": 15,
      "CRITICAL": 7
    },
    "urgent": [
      {
        "id": 50,
        "ticketNumber": "TKT-2026-000050",
        "summary": "Core switch power supply failure",
        "status": "OPEN",
        "itPriority": "CRITICAL",
        "updatedAt": "2026-09-26T09:00:00.000Z"
      }
    ],
    "recentlyUpdated": [
      {
        "id": 42,
        "ticketNumber": "TKT-2026-000042",
        "summary": "Laptop battery drains quickly",
        "status": "IN_PROGRESS",
        "itPriority": "MEDIUM",
        "updatedAt": "2026-09-26T10:15:00.000Z"
      }
    ],
    "users": {
      "REQUESTER": { "active": 25, "inactive": 2, "drillDown": "/admin/users?role=REQUESTER" },
      "IT_STAFF": { "active": 8, "inactive": 1, "drillDown": "/admin/users?role=IT_STAFF" },
      "ADMINISTRATOR": { "active": 2, "inactive": 0, "drillDown": "/admin/users?role=ADMINISTRATOR" }
    },
    "generatedAt": "2026-09-26T11:05:00.000Z",
    "timeZone": "Asia/Bangkok"
  }
  ```
  *Note:* The `users` field is populated for `ADMINISTRATOR` sessions and omitted or `null` for `IT_STAFF` sessions.

## 6. List Filters for Drill-down

To fulfill dashboard card drill-downs without loading unneeded records, the existing list endpoints accept enhanced query parameters:

### 6.1 `GET /api/staff/tickets` (Staff Queue)

- `statusGroup`:
  - `open`: Matches `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- `ownership` (existing Lab 3 filter, used by the Unassigned card drill-down):
  - `assigned`: Tickets with a Ticket Owner (`ownerId IS NOT NULL`).
  - `unassigned`: Tickets without a Ticket Owner (`ownerId IS NULL`).
- `ownerId`:
  - `me`: Resolves to `req.sessionUser.id`.
  - Integer string: Matches specific owner ID.
- `actionAssignee`:
  - `me`: Filters tickets having at least one `ActionTaken` with `assignedToId = req.sessionUser.id` and status in (`PLANNED`, `IN_PROGRESS`).
- `followUp`:
  - `pending`: Filters tickets having at least one `ActionTaken` with `followUpRequired = true` and status in (`PLANNED`, `IN_PROGRESS`).

### 6.2 `GET /api/tickets` (Requester Tickets)

- `statusGroup`:
  - `open`: Matches `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.

Invalid or unrecognized values return `400 Bad Request`.

## 7. Changed Lab 3 Endpoints

Per Lab 4 handout Section 4.3 (superseding Lab 3 BR-23 and BR-41), Administrators gain full access to operational IT Staff endpoints:

| Endpoint | Previous Roles (Lab 3) | New Roles (Lab 4) | Behavioral Changes / Notes |
|---|---|---|---|
| `GET /api/staff/tickets` | `IT_STAFF` | `IT_STAFF`, `ADMINISTRATOR` | Queue access; supports new drill-down query params |
| `GET /api/staff/tickets/:id` | `IT_STAFF`, `ADMINISTRATOR` | `IT_STAFF`, `ADMINISTRATOR` | Includes `version`, actions count, history count |
| `POST /api/staff/tickets/:id/claim` | `IT_STAFF` | `IT_STAFF`, `ADMINISTRATOR` | Claim ticket; returns owner `email` in response |
| `PUT /api/staff/tickets/:id/owner` | `IT_STAFF` | `IT_STAFF`, `ADMINISTRATOR` | Reassign ticket; assignee must still be active `IT_STAFF`; returns owner `email` |
| `PATCH /api/staff/tickets/:id/it-priority` | `IT_STAFF` | `IT_STAFF`, `ADMINISTRATOR` | Set IT Priority |
| `POST /api/staff/tickets/:id/status` | `IT_STAFF` | `IT_STAFF`, `ADMINISTRATOR` | Enforces matrix, resolution gate, OCC, and history logging |
| `GET /api/staff/tickets/:id/internal-notes` | `IT_STAFF`, `ADMINISTRATOR` | `IT_STAFF`, `ADMINISTRATOR` | Unchanged read access |
| `POST /api/staff/tickets/:id/internal-notes` | `IT_STAFF`, `ADMINISTRATOR` | `IT_STAFF`, `ADMINISTRATOR` | Unchanged create access |
| `POST /api/tickets/:id/public-comments` | All roles | All roles | IT Staff and Admin comments marked as staff responses |

## 8. Authorization & Safe Error Table

| Endpoint | No Session | Requester (Own) | Requester (Other) | IT Staff | Administrator | Bad CSRF Token |
|---|---|---|---|---|---|---|
| `GET /api/tickets/:id/actions` | 401 | 200 | 404 | 200 | 200 | 200 (Safe read) |
| `POST /api/tickets/:id/actions` | 401 | 403 | 403 | 201/200 | 201/200 | 403 |
| `PATCH /api/actions/:id` | 401 | 403 | 403 | 200 | 200 | 403 |
| `POST /api/staff/tickets/:id/status` | 401 | 403 | 403 | 200 | 200 | 403 |
| `GET /api/tickets/:id/status-history` | 401 | 200 | 404 | 200 | 200 | 200 (Safe read) |
| `GET /api/dashboard/requester` | 401 | 200 | N/A | 403 | 403 | 200 (Safe read) |
| `GET /api/dashboard/staff` | 401 | 403 | 403 | 200 | 200 (with users) | 200 (Safe read) |
| `GET /api/staff/tickets` | 401 | 403 | 403 | 200 | 200 | 200 (Safe read) |
| `POST /api/staff/tickets/:id/claim` | 401 | 403 | 403 | 200 | 200 | 403 |

## 9. Concurrency, Idempotency and CSRF

### 9.1 Optimistic Concurrency Control (OCC)

- Both `Ticket` and `ActionTaken` tables feature an integer `version` initialized to 1.
- Every mutating write executes a conditional atomic update:
  ```sql
  UPDATE "Ticket" SET "currentStatus" = $1, "version" = "version" + 1, "updatedAt" = NOW()
  WHERE "id" = $2 AND "version" = $3;
  ```
- If 0 rows are affected:
  1. The server queries the latest record state.
  2. The server responds with `409 Conflict`, error code `STALE_UPDATE`, and embeds the current entity state in `error.current`.

### 9.2 Duplicate Submission and Idempotency

- `POST /api/tickets/:id/actions` accepts an `Idempotency-Key` header.
- The unique constraint `@@unique([ticketId, idempotencyKey])` guarantees that parallel or repeated requests cannot insert duplicate rows.
- If a record with the given key already exists for the ticket:
  1. The server fetches and returns the existing record.
  2. The HTTP response code is `200 OK` (rather than `201 Created`).
  3. Header `Idempotent-Replay: true` is included.

### 9.3 CSRF Protection

- Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) requires:
  1. **Origin Verification:** Header `Origin` (or `Referer` if `Origin` is missing) must match the configured application origin.
  2. **Token Verification:** Header `X-CSRF-Token` must be present and match the HMAC signature of the authenticated session token.
- Failure of either check terminates the request immediately with `403 Forbidden`, error code `CSRF_ERROR`.
