---
name: github-actions
description: Use when working with GitHub Actions workflows or the gh CLI — CI, the ingestion/normalization pipeline in .github/workflows, workflow runs and logs, dispatching jobs, and managing repo secrets/variables (OPENROUTER_API_KEY, SUPABASE_DB_URL).
---

# GitHub Actions

This project runs ETL/ingestion as GitHub Actions jobs, NOT as Vercel requests
(see docs/deployment.md): fetch public fisheries sources → store `raw_import` →
normalize with OpenRouter → write to Supabase Postgres. Vercel functions stay
short and user-facing.

## gh CLI

`gh` is installed and authenticated (verify with `gh auth status`).

Workflow runs:

- `gh run list --limit 20`
- `gh run list --workflow=<file-or-name>`
- `gh run view <run-id>` — summary; `--log` for full logs
- `gh run view --job=<job-id> --log` — one job's logs
- `gh run watch <run-id>` — follow live
- `gh run rerun <run-id>` — rerun; add `--failed` for failed jobs only
- `gh pr checks [number] [--watch]`

Workflows:

- `gh workflow list`
- `gh workflow run <file-or-name> [-f input=value] [--ref branch]` — manual dispatch
- `gh workflow view / enable / disable <file-or-name>`

Secrets & variables (never print values into chat or files):

- `gh secret list`
- `gh secret set NAME --body "value"` (or `gh secret set NAME < file`)
- `gh secret delete NAME`
- `gh variable list` / `gh variable set NAME --body "value"`

Anything else: `gh api repos/{owner}/{repo}/actions/...`

## Authoring workflows

- Files live in `.github/workflows/*.yml`.
- Ingestion jobs: trigger with both `schedule:` (cron, UTC) and
  `workflow_dispatch:` (with inputs) so they can also be run by hand.
- Add a `concurrency:` group per pipeline so ingestion runs never overlap.
- Keep `permissions:` minimal (usually just `contents: read`).
- Pin third-party actions to a full commit SHA, or at least a major version tag.
- Secrets come from repo secrets: `OPENROUTER_API_KEY`, `SUPABASE_DB_URL` /
  `SUPABASE_SERVICE_ROLE_KEY`. Pass via `env:` at job/step level; never hardcode.
- Long-running batch work (paging APIs, parsing documents, OpenRouter retries)
  belongs here, not in Vercel functions.

## Safety

- Never commit secrets; use `gh secret set`.
- Ask the user before dispatching workflows that write to the production
  database, or before rerunning/cancelling runs you did not start.
