# Verification report

Verified locally on 11 September 2026 using PostgreSQL 17.11, Python 3.14, and Node.js 25.8.1 (CI targets Node.js 22).

| Check | Result |
|---|---|
| Backend workflow/API suite | 8 passed against a dedicated PostgreSQL database |
| TypeScript + Vite production build | Passed |
| Playwright end-to-end browser smoke test | 1 passed |
| Python undefined/unused imports and import ordering | Ruff F/I checks passed |
| PDF sample | Rendered and visually inspected; one readable page |
| Desktop UI | Empty and populated screens inspected at 1512×982 |
| Mobile UI | Inspected at 390×844; no horizontal overflow |
| Secrets in staged source | No credential-pattern matches; only `.env.example` tracked |

The backend suite covers unknown quantity handling, correction preservation, draft replacement, non-mutating questions, unknown-risk handling, human-review requirements, persistent records, exact duplicate hints, idempotent commits, lifecycle enforcement, invalid and oversized uploads, EML parsing, PDF parsing including wrapped description lines, and the missing live-key error.

Browser smoke verification exercises sample intake, conversational batch/quantity correction, review and commit, persistence after page reload, investigation updates, PDF-driven form population and Critical triage, plus mobile overflow and JavaScript-error checks. The reproducible test is `frontend/e2e/workflow.spec.ts`.

Live Groq inference has **not** been run: the requested API-key placeholder is present and no real key was supplied. All demonstrated extraction results used labeled demo mode. The Docker daemon was unavailable on the task machine, so local testing used PostgreSQL directly; the Compose file is provided for reproducible setup on machines with Docker. CI independently runs the full backend suite against a PostgreSQL service and builds the frontend.

The backend test run emits one upstream Starlette/AnyIO deprecation warning. It does not affect the passing assertions. This is prototype verification, not pharmaceutical validation or proof of regulatory compliance.
