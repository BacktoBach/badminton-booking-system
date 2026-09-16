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
