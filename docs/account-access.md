# Account Access And Owner Bootstrap

EduFerma is invite-only. Clerk authenticates the browser session, but the remote
Postgres `users` table authorizes access. Do not grant dashboard access from
Clerk email alone, except the first owner bootstrap described below.

## Required Env Vars

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk browser key.
- `CLERK_SECRET_KEY`: Clerk server key.
- `OWNER_EMAIL`: verified email allowed to bootstrap the first owner DB row.
- `DATABASE_URL`: pooled remote Postgres runtime URL, or a supported
  Vercel/Neon provider alias ending in `_DATABASE_URL` / `_POSTGRES_URL`.
- `DIRECT_DATABASE_URL`: direct migration URL when available.

Never commit real values. Vercel/local env values must stay in Vercel, GitHub
secrets, or `.env.local`.

## Runtime Flow

1. `/api/health` reports `clerk:false` and the missing env names when Clerk is
   not configured. It does not print secret values.
2. Protected APIs return `SETUP_REQUIRED` while Clerk env is missing.
3. After Clerk login, the app resolves the Clerk user against remote DB by
   `auth_provider_user_id`, `clerk_user_id`, then normalized `email`.
4. If `OWNER_EMAIL` matches the signed-in verified email and no DB user exists,
   EduFerma creates an active `owner` row.
5. Non-owner users must already exist in remote DB. A pending email-only row is
   linked to Clerk on first successful login.

## Creating Users

Dry-run first:

```bash
pnpm access:bootstrap -- --email=teacher@example.com --role=teacher --display-name="Teacher Name" --invite
```

Apply after review:

```bash
pnpm access:bootstrap -- --email=teacher@example.com --role=teacher --display-name="Teacher Name" --invite --apply
```

If the Clerk user ID is already known, add it:

```bash
pnpm access:bootstrap -- --email=teacher@example.com --role=teacher --clerk-user-id=user_... --apply
```

The script stores only DB rows. Clerk invitations/users are still managed in
Clerk, and the Clerk/Vercel secret values must not be printed.

## Creating Students

Student access requires both a `users` row and a `students` profile. The
bootstrap script creates both for `--role=student`:

```bash
pnpm access:bootstrap -- \
  --email=student@example.com \
  --role=student \
  --display-name="Student Name" \
  --public-code=student-name \
  --learning-track=ege_informatics \
  --tutor-email=teacher@example.com \
  --invite \
  --apply
```

Minimal fields:

- `users.email`: normalized verified email.
- `users.role`: `owner`, `teacher`, `tutor`, `student`, or `guardian`.
- `users.is_active`: must be true to enter dashboards.
- `users.clerk_user_id` / `users.auth_provider_user_id`: optional before first
  login, filled from Clerk when known.
- `students.user_id`: DB user row for student login.
- `students.public_code`, `students.display_name`, `students.learning_track`.
- `teacher_student_links.teacher_user_id` and `student_id`, or
  `students.tutor_user_id`, to grant teacher visibility.
