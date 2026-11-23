# Task log (maintained by ORCHESTRATOR)
| ID | Owner | Objective | Status |
|----|-------|-----------|--------|
| T0 | ORCH | Scaffold, deps, agent files, config | DONE |
| T1 | DEVELOP | DB + RLS + auth + proxy | DONE (3 review cycles; CRITICAL ON CONFLICT regression found by TESTING and fixed) |
| T1R | TESTING | Review schema/RLS/auth | APPROVED (Postgres 16 local; real Supabase NOT VERIFIED) |
| T2a | DEVELOP | UI kit, layout, categories, transactions | DONE |
| T2aR | TESTING | Review T2a | APPROVED |
| T2b | DEVELOP | Dashboard, budgets, reports | DONE |
| T2bR | TESTING | Review T2b | APPROVED |
| T3 | DEVELOP | Timezone, decimal comma, a11y, NUL, MAX_ROWS, revalidation | DONE |
| T3R | TESTING | Retest + final security + e2e (12 anon e2e pass) | APPROVED |
| T4 | DEVELOP | Server error-code logging, Date.now/io() fix | DONE; orchestrator verified lint/tsc/332 tests/build; NOT independently reviewed by TESTING; io() fix not yet confirmed in dev runtime |
| T5 | ORCH | README, render.yaml, final validation | DONE |
