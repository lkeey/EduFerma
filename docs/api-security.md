# API Security

## Roles

Supported roles: `owner`, `teacher`, `tutor`, `student`, `guardian`, `guest`.

- `owner`, `teacher` and `tutor` can access teacher APIs.
- `student` and `guardian` can access student APIs scoped to their own data.
- `guest` can access public endpoints only.

## Server Enforcement

Proxy/middleware is not enough. Every protected route handler and protected page
must perform server-side auth and role checks.

DB-backed services must also resolve the linked `users` row, require
`is_active=true`, and apply `users.role` plus ownership checks before returning
student or teacher data.

## Student-Safe Data

Student-facing serializers must remove:

- `answer_json`
- `solution_md`
- teacher notes
- local source paths
- internal source paths
- audit metadata

## DB Health

`/api/health` is public and exposes only basic booleans. `/api/health/db` is
protected and must not return secrets or raw connection errors.
