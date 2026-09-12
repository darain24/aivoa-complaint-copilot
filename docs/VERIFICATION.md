# Verification report

Initial verification on 11 September 2026; live integration verified on 12 September 2026 using PostgreSQL 17.11, Python 3.14, and Node.js 25.8.1 (CI targets Node.js 22).

| Check | Result |
|---|---|
| Backend workflow/API suite | 10 passed against a dedicated PostgreSQL database, including Neon URL normalization |
| TypeScript + Vite production build | Passed |
| Playwright end-to-end browser smoke test | 1 passed |
| Python undefined/unused imports and import ordering | Ruff F/I checks passed |
| PDF sample | Rendered and visually inspected; one readable page |
| Desktop UI | Empty and populated screens inspected at 1512×982 |
| Mobile UI | Inspected at 390×844; no horizontal overflow |
| Secrets in staged source | No credential-pattern matches; only `.env.example` tracked |

The backend suite covers unknown quantity handling, correction preservation, draft replacement, non-mutating questions, unknown-risk handling, human-review requirements, persistent records, exact duplicate hints, idempotent commits, lifecycle enforcement, invalid and oversized uploads, EML parsing, PDF parsing including wrapped description lines, and the missing live-key error.

Browser smoke verification exercises sample intake, conversational batch/quantity correction, review and commit, persistence after page reload, investigation updates, PDF-driven form population and Critical triage, plus mobile overflow and JavaScript-error checks. The reproducible test is `frontend/e2e/workflow.spec.ts`.

Live Groq intake and correction passed on 12 September 2026 using the user-approved `openai/gpt-oss-120b` model. The supplied Neon database connection passed and the application initialized its complaint schema. Original local smoke tests used demo mode; the final product recording uses live Groq and Neon. The real key and connection URL remain in the ignored `.env`; `.env.example` contains only placeholders. The Docker daemon was unavailable on the task machine, so local testing used PostgreSQL directly; the Compose file is provided for reproducible setup on machines with Docker. CI independently runs the full backend suite against a PostgreSQL service and builds the frontend.

The backend test run emits one upstream Starlette/AnyIO deprecation warning. It does not affect the passing assertions. This is prototype verification, not pharmaceutical validation or proof of regulatory compliance.
