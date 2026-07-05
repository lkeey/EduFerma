# Demo Auth

Production auth remains Clerk. Demo auth is only for local/dev verification when
Clerk keys are unavailable.

Enable locally:

```env
ENABLE_DEMO_AUTH=true
```

Then open `/sign-in` and choose:

- teacher: `teacher.demo@edu-ferma.local`
- student: `student.demo@edu-ferma.local`

Demo auth is blocked when `VERCEL_ENV=production`; do not use it for production
security claims.
