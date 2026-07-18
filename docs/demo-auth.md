# Demo Auth

Production auth remains Clerk. Demo auth is only for local/dev verification when
Clerk keys are unavailable.

Enable locally:

```env
ENABLE_DEMO_AUTH=true
```

Then open `/sign-in` and choose:

- owner: `owner.demo@edu-ferma.local`, redirected to `/owner/access`;
- guest: `guest.demo@edu-ferma.local`, redirected to `/access-pending`;
- teacher: `teacher.demo@edu-ferma.local`
- student: `student.demo@edu-ferma.local`

`/sign-up` also exposes the guest/pending entry in demo mode. Demo auth is
blocked when either `NODE_ENV=production` or `VERCEL_ENV=production`; do not use
it for production security claims.

The deterministic local Playwright suite covers pending-status refresh,
logout/account switching, owner-page identity/timestamp columns, and filters.
The shared demo owner service intentionally returns empty request/user lists and
does not implement successful owner mutations. The coordinator must provide an
isolated DB-backed seed/fixture before Playwright can exercise approve, reject,
block/restore, owner demotion, and role-change dialogs through successful owner
mutations. Do not emulate those successes in the shared demo service.
