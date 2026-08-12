# Simple Authentication Scheme

## Recommendation

Use **Supabase Auth**, but keep the core map public.

Authentication is unnecessary for the main MVP workflow. Use it first for:
- normalization review/admin UI
- manual merge/correction tools
- future favorites/saved places

## MVP flow

Start with **email magic-link authentication** for admins/reviewers.

1. User enters email.
2. Supabase sends a one-time sign-in link.
3. The callback establishes a browser session.
4. Supabase issues/refreshes JWT-backed sessions.
5. Server/admin operations verify the session.
6. PostgreSQL Row Level Security controls protected reads/writes.

No application password table is required.

## Authorization

A tiny app profile table is enough:

```sql
create table app_user (
  id uuid primary key references auth.users(id),
  role text not null default 'user'
    check (role in ('user', 'reviewer', 'admin'))
);
```

Suggested access:
- anonymous: read public water/species data
- user: same + future saved data
- reviewer: approve/reject normalization
- admin: reviewer + source/job management

For the MVP, allowlist known reviewer/admin emails.

## RLS

Enable RLS on user-owned and admin-mutated tables.

Never expose raw imports, inference logs, service-role credentials, or review internals through anonymous database policies.

## Social login later

If consumer accounts become useful, add Google and Apple OAuth through Supabase. Do not add username/password auth without a real requirement.

## Secrets

- Browser: Supabase publishable/anon config only.
- Vercel server: server secrets.
- OpenRouter key: server/job only.
- Supabase service-role key: job/admin server only; never browser-side.

Official docs:
`https://supabase.com/docs/guides/auth`
`https://supabase.com/docs/guides/auth/social-login`
