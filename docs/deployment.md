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

For private dashboards, production must have these auth env vars configured:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `OWNER_EMAIL`

If `/api/health` reports `database:true` and `clerk:false`, the app has remote
DB access but cannot authenticate real users. Add the Clerk env vars in Vercel
and keep server-side role guards enabled.
## Deployment Governance

Preferred deployment path:

1. Connect `https://github.com/lkeey/EduFerma.git` to Vercel through Git integration.
2. Pull requests create Vercel preview deployments.
3. Merges to `main` create production deployments.
4. Store all production and preview secrets in Vercel or GitHub settings, never in git.

Before merge, check the GitHub Actions jobs documented in `docs/ci-quality-gates.md`. Branch
protection recommendations live in `docs/branch-protection-setup.md`.
