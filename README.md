# AIVOA Complaint Copilot

A pharmaceutical customer complaint workspace: turn text, email, or a PDF into a structured complaint, correct it conversationally, review triage guidance, and commit a durable record to a PostgreSQL QMS ledger.

**Stack:** React 19 · TypeScript · Redux Toolkit · FastAPI · LangGraph · Groq · PostgreSQL · Inter.

![Complaint intake workspace](docs/intake-screenshot.png)

## Start locally

Prerequisites: Node.js 22+, Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/), and Docker with Compose (or an existing PostgreSQL 17 database).

```sh
# Repository root
cp backend/.env.example backend/.env
# Set DATABASE_URL to your Neon URL, or use the local Compose database below.
docker compose up -d db

# Terminal 1
cd backend
uv sync --frozen
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2, from repository root
cd frontend
npm ci
npm run dev
```

Open [the app](http://localhost:5173) and [interactive API docs](http://localhost:8000/docs). Tables are initialized at API startup. Database data survives API restarts and `docker compose down`; deleting the Docker volume removes it.

The local Compose database is exposed on port **5433**; set `DATABASE_URL=postgresql+psycopg://aivoa:aivoa@localhost:5433/aivoa` when using it.

Using an existing database? Set `DATABASE_URL` in `backend/.env` to a standard Neon URL (`postgresql://USER:PASSWORD@HOST/DB?sslmode=require`) or a PostgreSQL SQLAlchemy URL (`postgresql+psycopg://USER:PASSWORD@HOST:PORT/DB`). The backend normalizes standard Postgres URLs to psycopg 3. Use UTF-8 database encoding. Run backend commands from `backend/` so the `.env` is found.

## Add your Groq key

The app starts in **demo mode** without credentials. In `backend/.env`, set:

```dotenv
AI_MODE=live
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Replace the placeholder with your real key, then restart the backend. Keep the key on the server; never put it in a `VITE_` variable. `.env` is ignored by Git.

The assignment requests `gemma2-9b-it` or `llama-3.3-70b-versatile`. Groq [retired Gemma in October 2025 and Llama for free/developer usage in August 2026](https://console.groq.com/docs/deprecations). After verifying the available models and obtaining user approval, this implementation uses Groq's recommended replacement, `openai/gpt-oss-120b`. This is an explicitly documented model substitution; `GROQ_MODEL` remains configurable.

**Truthful mode boundaries:** Live mode uses Groq for schema-validated extraction and conversational field corrections. Demo mode uses deterministic label/regex extraction, with the same real LangGraph orchestration. Risk classification, completeness, summary, duplicate checks, investigation hypotheses, CAPA suggestions, and question responses are transparent local rules/templates in both modes. These are support tools, not additional LLM agents. Live API failures are surfaced; they never silently fall back to demo results. Live Groq intake and conversational correction were verified on 12 September 2026 using a user-supplied key, with PostgreSQL hosted on Neon.

## Demonstration flow

1. Click **Discolored capsules**, or paste `samples/pharmacy-complaint.txt` using **New complaint**.
2. Inspect the extracted details and Major triage suggestion. All fields are editable.
3. In **Correct current draft**, send: `Sorry the batch number is BMX240602 and affected quantity is 48 capsules`.
4. Verify that batch and quantity changed while customer, product, and dates stayed intact.
5. Ask `What CAPA is suggested?` using **Ask about this complaint**. Questions preserve form values.
6. Enter a reviewer name, check the review box, and commit. Open the QMS ledger; refresh the page to verify persistence.
7. Create another complaint from the same product and corrected batch to see a possible-duplicate warning. The warning does not automatically merge separate incidents.
8. Upload `samples/api-complaint.pdf`. This starts a **new** complaint and replaces the current draft. Metformin API foreign matter produces a Critical triage signal. The absent expiry date stays blank.
9. Correct its quantity or batch, review, and commit. Use **View** in the ledger to start an investigation, add notes, close the record, and export JSON.

TXT, plain-text EML, label-based CSV, and text-based PDF uploads are supported (10 MB; PDFs up to 30 pages; extracted text up to 20,000 characters). CSV support means text intake, not a multi-row bulk importer. Scanned PDF/image OCR and DOCX are deliberately outside this implementation. A readable error asks the user to paste text instead.

## How data moves

```mermaid
flowchart LR
  UI[React form / copilot] --> Redux[Redux Toolkit draft + messages]
  Redux --> API[FastAPI intake or upload]
  API --> Parse[Parse text / PDF / EML]
  Parse --> Graph[LangGraph]
  Graph --> Extract[Groq or demo extraction]
  Extract --> Validate[Pydantic validation]
  Validate --> Assess[Rule-based risk + completeness]
  Assess --> Respond[Response + workflow trace]
  Respond --> UI
  UI --> Review[Human review]
  Review --> Commit[POST complaints]
  Commit --> DB[(PostgreSQL record + audit)]
```

- `frontend/src/App.tsx`: intake, upload, correction, editable form, assessment, and ledger UI.
- `frontend/src/store.ts`: Redux actions; manual edits invalidate prior assessment and review; async result updates form and conversation together.
- `backend/app/models.py`: bounded input schemas and explicit new/correct/question operations.
- `backend/app/agent.py`: compiled LangGraph, Groq extraction adapter, demo parser, triage policy, completeness and response generation.
- `backend/app/main.py`: validation, document parsing, graph invocation, duplicate lookup, review-gated commit and lifecycle endpoints.
- `backend/app/database.py`: settings, SQLAlchemy records, PostgreSQL connection.
- `backend/tests/test_workflow.py`: graph and database-backed API regression tests.
- `docs/DEMO-SCRIPT.md`: two complete narration scripts with scene-by-scene screen actions.
- `docs/ARCHITECTURE.md`: domain research, decisions, limitations, and requirement mapping.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Database and AI mode status |
| POST | `/api/intake` | New intake, correction, or question with current draft |
| POST | `/api/upload` | Extract a document and create a fresh draft |
| POST | `/api/assess` | Reassess manually edited form and find duplicates |
| GET | `/api/complaints` | Most recent 500 committed records |
| POST | `/api/complaints` | Reviewed, complete, idempotent ledger commit |
| PATCH | `/api/complaints/{id}` | Open → Under investigation → Closed, with notes |

## Verify

```sh
cd backend
uv run pytest -q  # unit tests; DB integration cases skip without TEST_DATABASE_URL
```

For the complete PostgreSQL suite, create a separate test database whose name ends in `_test`:

```sh
# From repository root with the Compose database running:
docker compose exec db createdb -U aivoa aivoa_test
cd backend
DATABASE_URL=postgresql+psycopg://aivoa:aivoa@localhost:5433/aivoa_test \
TEST_DATABASE_URL=postgresql+psycopg://aivoa:aivoa@localhost:5433/aivoa_test \
AI_MODE=demo uv run pytest -q

cd ../frontend
npm run build
```

The integration fixture clears only the explicitly configured test database. CI runs all backend cases against PostgreSQL and builds the frontend. For browser smoke tests, start the application in demo mode with a disposable demo database, then `cd frontend && npx playwright install chromium && npm run test:e2e`. Browser tests create fictional ledger records.

## Scope and product decisions

This is an internship prototype, not a validated pharmaceutical QMS. Reviewer names are entered labels, not authenticated identities. It has no RBAC, electronic signatures, immutable audit infrastructure, regulatory reporting, or production deployment configuration. Keep it on loopback and use fictional data. The original assignment and reference video are not redistributed in this repository.

A draft exists in Redux memory until committed; reloading before commit discards it. Committed records retain structured facts, assessment, and lifecycle notes; source files and the pre-commit chat are not stored. Exact product-and-batch matching provides a duplicate hint, not semantic duplicate detection. Keyword triage is deliberately conservative and can overflag negated or historical statements; a QA reviewer must evaluate the actual evidence. Root causes are hypotheses, and CAPA suggestions are starting points. No automatic release, recall, or medical decision is made.

See [domain and design notes](docs/ARCHITECTURE.md) and [verification results](docs/VERIFICATION.md).
