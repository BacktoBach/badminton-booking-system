# Backend API Contract

All endpoints are prefixed with `/api`. JSON errors use the shared shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request query is invalid",
    "details": {}
  }
}
```

`details` is present only when additional safe validation information is available.

## Health

`GET /health` returns `200` with `{ "status": "ok", "database": "connected", "uptime": 123 }`.
If PostgreSQL is unavailable it returns `503 DATABASE_UNAVAILABLE` without database details.

## Authentication

Authentication uses a JWT stored only in an HTTP-only cookie. Clients must send cookies/credentials;
no endpoint returns the raw token. Development uses `auth_session`; production uses the secure
`__Host-auth_session` cookie.

### Register

`POST /auth/register`

```json
{
  "name": "Student One",
  "email": "student@example.com",
  "password": "Password123"
}
```

Success returns `201` with `data.user` containing `id`, `name`, `email` and role `user`. Public
registration cannot set role. Duplicate email returns `409 EMAIL_ALREADY_EXISTS`.

### Login

`POST /auth/login`

```json
{
  "email": "student@example.com",
  "password": "Password123",
  "remember": true
}
```

Success returns `200`, sets the HTTP-only cookie and returns `data.user` plus
`data.session.expiresAt`. `remember: true` gives the cookie a one-day max age; otherwise it is a
browser-session cookie. Unknown email and incorrect password both return the same
`401 INVALID_CREDENTIALS` response.

### Current session

`GET /auth/me`

Requires a valid cookie. Success returns `data.user` and `data.session.expiresAt`. Missing, invalid,
expired or revoked sessions return `401` with `AUTH_REQUIRED`, `INVALID_TOKEN` or `TOKEN_REVOKED`.

### Change password

`PUT /auth/change-password`

```json
{
  "oldPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

Success returns `200`, increments `token_version` and clears the cookie so every existing token is
rejected. An incorrect current password returns `400 CURRENT_PASSWORD_INCORRECT`.

### Logout

`POST /auth/logout` always returns `200` and clears the cookie, including when no session exists.

## Public classes

### List upcoming classes

`GET /classes?page=1&limit=9&search=academy&level=beginner`

Query parameters:

| Name | Default | Rules |
| --- | ---: | --- |
| `page` | `1` | Positive integer |
| `limit` | `9` | Integer from 1 to 50 |
| `search` | none | Case-insensitive literal title search, maximum 100 characters |
| `level` | none | `beginner`, `intermediate`, or `advanced` |

Only classes with `startDate` later than the database's current time are returned. Filtering happens
before pagination. Results are ordered by `startDate`, then `id`, both ascending.

Successful response (`200`):

```json
{
  "data": [
    {
      "id": "9d52dfc0-0e36-4c9d-aa17-0e4a40e7cc86",
      "title": "Beginner Footwork",
      "description": "Footwork foundations for new badminton players.",
      "coachName": "Coach An",
      "level": "beginner",
      "startDate": "2026-10-01T11:00:00.000Z",
      "schedule": "Monday and Wednesday, 18:00-19:30",
      "location": "Court One",
      "currentStudents": 4,
      "maxStudents": 12,
      "availableSlots": 8,
      "isFull": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 9,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Invalid query parameters return `400 VALIDATION_ERROR`. A valid page beyond the last page returns an
empty `data` array while retaining the filtered totals in `meta`.

### Get class detail

`GET /classes/:classId`

The successful response (`200`) contains one class DTO in `data`, using the same fields as a list
item. An invalid UUID returns `400 VALIDATION_ERROR`; a valid UUID with no matching class returns
`404 CLASS_NOT_FOUND`.

## Admin classes

All endpoints in this section require a valid authentication cookie and the current database role
`admin`. Missing authentication returns `401`; a non-admin account returns `403 FORBIDDEN`.

### List all classes

`GET /admin/classes?page=1&limit=9&search=academy&level=beginner`

The query contract is the same as the public list, but both past and upcoming classes are included.
Results are ordered by `startDate DESC, id ASC`. The response uses the same class DTO and pagination
envelope as the public list.

### Create a class

`POST /classes`

```json
{
  "title": "Beginner Footwork",
  "description": "Footwork foundations for new badminton players.",
  "coachName": "Coach An",
  "level": "beginner",
  "startDate": "2026-10-01T11:00:00.000Z",
  "schedule": "Monday and Wednesday, 18:00-19:30",
  "location": "Court One",
  "maxStudents": 12
}
```

`startDate` must be a future ISO 8601 timestamp with an offset. `maxStudents` must be an integer from
1 to 500. Unknown properties are rejected. `created_by_id` is always derived from the authenticated
admin and cannot be supplied by the client. Success returns `201` with the created class DTO.

### Update a class

`PATCH /classes/:classId`

The body accepts any non-empty subset of the create fields. If `startDate` is supplied, it must be in
the future. Reducing `maxStudents` below the current enrollment count returns:

```json
{
  "error": {
    "code": "CAPACITY_BELOW_CURRENT_ENROLLMENTS",
    "message": "Maximum students cannot be lower than the current enrollment count"
  }
}
```

Success returns `200` with the updated class DTO. A missing class returns `404 CLASS_NOT_FOUND`.

### Delete a class

`DELETE /classes/:classId`

Success returns `204` with no response body. Related enrollment rows are deleted by the database
foreign-key cascade. A missing class returns `404 CLASS_NOT_FOUND`.

### List enrolled students

`GET /classes/:classId/students?page=1&limit=20&search=nguyen`

Search is case-insensitive literal matching against student name or email. It runs before pagination.
The limit must be from 1 to 50.

```json
{
  "data": [
    {
      "id": "e548f7c7-e627-424b-8330-9a13565cd18f",
      "name": "An Nguyen",
      "email": "an@example.com",
      "enrolledAt": "2026-09-16T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Password hashes, role and token version are never returned. A missing class returns
`404 CLASS_NOT_FOUND`.

## Enrollments

Enrollment endpoints require a valid authentication cookie and the current database role `user`.
Admin accounts receive `403 FORBIDDEN` because admins manage classes but do not enroll as students.

### Enroll in a class

`POST /classes/:classId/enrollments`

The endpoint takes no request body. Success returns `201` with the class DTO after its capacity has
been updated.

Possible business errors:

| Status | Code | Meaning |
| ---: | --- | --- |
| `404` | `CLASS_NOT_FOUND` | The class does not exist |
| `409` | `CLASS_ALREADY_STARTED` | Its start time has passed |
| `409` | `DUPLICATE_ENROLLMENT` | The user is already enrolled |
| `409` | `CLASS_FULL` | Current enrollment has reached capacity |

The operation runs in a PostgreSQL transaction and locks the class row before checking duplicate and
capacity rules. Concurrent requests therefore cannot overbook the class.

### Cancel enrollment

`DELETE /classes/:classId/enrollments`

Success returns `200` with the class DTO after its capacity has been updated. A missing class returns
`404 CLASS_NOT_FOUND`; a class without an enrollment for the current user returns
`404 ENROLLMENT_NOT_FOUND`.

### List my classes

`GET /enrollments/me?page=1&limit=10&status=upcoming`

Query parameters:

| Name | Default | Rules |
| --- | ---: | --- |
| `page` | `1` | Positive integer |
| `limit` | `10` | Integer from 1 to 50 |
| `status` | `upcoming` | `upcoming`, `past`, or `all` |

Filtering and pagination run in PostgreSQL. Upcoming/all results use ascending start time; past
results use descending start time. Each list item contains the standard class DTO plus `enrolledAt`.
