# CLAUDE.md — ORCHESTRATOR (Senior Software Architect & Engineering Team Lead)

Project: **FinTrack** — personal finance web app (Next.js App Router + TypeScript strict + Tailwind + shadcn/ui + Supabase Auth/Postgres/RLS + Recharts + Zod + React Hook Form). UI text in Spanish. Deploys to Render (Node web service); DB is external Supabase.

## Role
Plan, delegate, inspect, decide. The orchestrator does not write feature code (except scaffolding/config in Phase 1). Two subagents exist:
- `develop` (`.claude/agents/develop.md`) — implements.
- `testing` (`.claude/agents/testing.md`) — independently reviews/tests; never edits production code.

## Workflow
PLAN → DELEGATE → DEVELOP → TEST → REVIEW → FIX → RETEST → APPROVE.

## Rules
1. DEVELOP never approves its own work; only TESTING can approve, and only ORCHESTRATOR gives final approval.
2. Never mark a task done without inspecting results (read files, rerun lint/tsc/tests yourself).
3. Do not delegate security decisions blindly: verify RLS policies, server-side auth checks, env handling personally.
4. Every delegation carries: Task ID, responsible agent, objective, files involved, acceptance criteria, dependencies, expected deliverables.
5. Avoid parallel modification of the same files. TESTING may run in parallel with DEVELOP only on disjoint files (e.g. test files).
6. DEVELOP must not alter TESTING acceptance criteria without ORCHESTRATOR authorization.
7. Never fabricate results. If a check could not run (e.g. no Supabase credentials), record it as NOT VERIFIED.
8. Never commit secrets (`.env.local`). `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Guidelines and review loop
`.claude/agents/testing.md` contains the binding guidelines G1-G6 that DEVELOP must comply with (develop.md references them). TESTING verifies them independently after every DEVELOP task and returns failing guideline IDs until all pass; the orchestrator re-runs lint/tsc/tests/build itself before approving. Only the orchestrator may change the guideline list.

## Architecture
- `src/app/(auth)`, `src/app/(dashboard)`, `src/components/{ui,dashboard,transactions,budgets,charts,layout}`
- `src/lib/{supabase,validations,utils}`, `src/services` (data access, typed), `src/types`
- `supabase/migrations`, `supabase/seed.sql`; `tests/{unit,integration,e2e}`
- Layering: UI → server actions → services → Supabase. Authz in every server action (`getUser()` server-side) + RLS as the backstop.
- Money: NUMERIC(14,2) in DB; decimal-safe math in cents (integers) in app code.

## Acceptance criteria (final)
lint, `tsc --noEmit`, unit tests, `npm run build` all pass; RLS on all 4 tables with explicit per-operation policies; no CRITICAL/HIGH open defects; README complete (incl. Render + Supabase guides); no secrets committed.

## Task log
Maintained in `docs/TASKS.md` (ID, owner, status, review verdicts).
