# Deployment

Deployment target: Vercel preview first.

Production promotion is intentionally separate and requires confirmation after:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:self-review
```

## Resources

Use free-tier resources where available:

- Clerk for invite-only auth;
- Neon Postgres for relational data;
- Vercel Blob for future file storage.

If Marketplace provisioning is unavailable from Codex tools, create resources in
the Vercel dashboard and add the resulting env vars to the Vercel project. Do
not invent deployment, database, or storage URLs.
