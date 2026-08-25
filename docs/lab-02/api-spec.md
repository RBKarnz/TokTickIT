# Lab 2 API Specification

## 1. Overview
This document outlines the REST API contracts required for Lab 2. The API handles fetching reference data (Categories, Systems, Requesters) and managing Tickets and Attachments.

## 2. Authentication Context
Since Lab 2 uses a temporary Development Requester selection rather than real authentication, the frontend must pass the selected `requesterId` in the request header or body as defined below to enforce ownership.
- Header: `X-Requester-Id: <id>` (Used for GET/DELETE requests)

## 3. Endpoints

### 3.1. Reference Data Endpoints

#### `GET /api/requesters`
- **Purpose**: Retrieve a list of active Development Requesters for the selection screen.
- **Request**: No parameters.
- **Response (200 OK)**:
  ```json
  [
    { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@example.com", "isActive": true }
  ]
  ```

#### `GET /api/categories`
- **Purpose**: Retrieve active Categories for the ticket creation form.
- **Response (200 OK)**:
  ```json
  [ { "id": 1, "name": "Hardware" }, { "id": 2, "name": "Software" } ]
  ```

#### `GET /api/systems`
- **Purpose**: Retrieve active Related Systems for the ticket creation form.
- **Response (200 OK)**:
  ```json
  [ { "id": 1, "name": "Corporate Laptop" }, { "id": 2, "name": "VPN" } ]
  ```

### 3.2. Ticket Endpoints

#### `POST /api/tickets`
- **Purpose**: Create a new ticket.
- **Headers**: `X-Requester-Id: <id>`
- **Request Body**:
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 1,
    "requestedPriority": "MEDIUM",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining much faster than usual..."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000001",
    "status": "NEW"
  }
  ```
- **Error (400 Bad Request)**: Invalid input (e.g., missing summary).

#### `GET /api/tickets`
- **Purpose**: Retrieve a paginated list of tickets owned by the current Requester.
- **Headers**: `X-Requester-Id: 1`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `search` (string, optional)
  - `sortField` (string, optional, e.g., 'createdAt')
  - `sortOrder` (asc/desc, optional)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000001",
        "summary": "Laptop battery drains quickly",
        "currentStatus": "NEW",
        "createdAt": "2026-08-25T10:00:00Z"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 10 }
  }
  ```
- **Error (401 Unauthorized)**: Missing `X-Requester-Id`.

#### `GET /api/tickets/:id`
- **Purpose**: Retrieve details of a specific ticket.
- **Headers**: `X-Requester-Id: 1`
- **Response (200 OK)**: Full ticket object including array of active `attachments`.
- **Error (403 Forbidden)**: Ticket does not belong to the Requester.
- **Error (404 Not Found)**: Ticket ID does not exist.

### 3.3. Attachment Endpoints

#### `POST /api/tickets/:id/attachments`
- **Purpose**: Upload an attachment to an existing ticket.
- **Headers**: `X-Requester-Id: 1`, `Content-Type: multipart/form-data`
- **Body**: form-data containing the `file`.
- **Response (201 Created)**: File metadata.
- **Error (400 Bad Request)**: File too large (>5MB) or invalid type.
- **Error (403 Forbidden)**: Max 5 attachments reached, or not ticket owner.

#### `GET /api/attachments/:id/download`
- **Purpose**: Download an active attachment.
- **Headers**: `X-Requester-Id: 1`
- **Response (200 OK)**: File stream.
- **Error (404 Not Found)**: Attachment is soft-removed or does not exist.
- **Error (403 Forbidden)**: Not ticket owner.

#### `DELETE /api/attachments/:id`
- **Purpose**: Soft-remove an attachment.
- **Headers**: `X-Requester-Id: 1`
- **Request Body**:
  ```json
  { "reason": "Uploaded wrong file" }
  ```
- **Response (200 OK)**: Success acknowledgment.
- **Error (403 Forbidden)**: Not ticket owner.
