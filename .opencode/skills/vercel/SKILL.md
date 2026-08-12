---
name: vercel
description: Use when deploying, configuring, or debugging the Next.js app on Vercel — vercel CLI, deployments, preview URLs, environment variables, vercel.json, build/function logs, and Vercel project settings.
---

# Vercel

Vercel hosts the Next.js + TypeScript app and its thin HTTP API. ETL/ingestion
does NOT run here — that is GitHub Actions (see docs/deployment.md).

## CLI

The `vercel` CLI is not installed globally. Use it project-locally:

- `pnpm dlx vercel <cmd>` or `npx vercel@latest <cmd>`
- Or add as a dev dependency: `pnpm add -D vercel`, then `pnpm vercel <cmd>`

Setup & local dev:

- `vercel login`
- `vercel link` — link the cwd to a Vercel project (creates `.vercel/`)
- `vercel pull` — pull project settings/env into `.vercel/`
- `vercel env pull .env.local` — pull env vars for local dev
- `vercel dev` — local dev mirroring the Vercel serverless runtime

Deploy & inspect:

- `vercel` — preview deployment
- `vercel --prod` — production (ASK the user first)
- `vercel ls` — recent deployments
- `vercel inspect <url-or-id>` — deployment details
- `vercel logs <url-or-id>` — build/function logs
- `vercel rollback <url-or-id>` — promote a previous deployment

Environment variables (scopes: production, preview, development):

- `vercel env ls`
- `vercel env add NAME production`
- `vercel env rm NAME production`

## Conventions

- Prefer Git integration (push/PR → automatic preview deployments) over CLI deploys.
- Keep request handlers short-running: no ETL, no paging external APIs, no
  OpenRouter batch loops in Vercel functions.
- Env vars the app needs: Supabase connection (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the browser; a pooled `DATABASE_URL` for
  server code). NEVER expose service-role keys or DB passwords with a
  `NEXT_PUBLIC_` prefix.
- Hobby plan is personal/non-commercial only (see docs/deployment.md).

## Safety

- Always ask before `vercel --prod` or changing production env vars.
- `.vercel/` and `.env.local` are gitignored — never commit them.
