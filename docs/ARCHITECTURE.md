# Domain, workflow, and implementation decisions

## Pharmaceutical context

An active pharmaceutical ingredient (API) becomes an input to downstream formulation. A finished dosage form (FDF), such as a capsule, is closer to the patient. Both need traceability to product, batch, source, quantity, and the reported defect. A foreign-particle report in an API drum and a discoloration report in an FDF bottle can lead to different investigations even when the intake mechanics are similar.

ICH Q10 describes a pharmaceutical quality system with monitoring, corrective/preventive action, change management, and management review. Customer complaint information can feed investigation and continual improvement. The implementation uses this context to connect complaint capture, triage, review, and an investigation trail; it does not claim regulatory compliance. Sources reviewed:

- [FDA: ICH Q10 Pharmaceutical Quality System](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q10-pharmaceutical-quality-system)
- [ICH Q10 guideline](https://database.ich.org/sites/default/files/Q10_Guideline.pdf)
- [EMA: ICH Q10](https://www.ema.europa.eu/en/ich-q10-pharmaceutical-quality-system-scientific-guideline)

Design inference: uncertain details should remain unknown. A system that invents a quantity or expiry date creates false traceability. The mandatory-field completeness check measures whether information is present, not whether a complaint is scientifically complete or the evidence is correct. Optional dates stay as report text to preserve partial dates such as “March 2026.” A production version should normalize dates, enforce chronology, and preserve the original evidence alongside the normalized values.

## Reference walkthrough observations

The supplied 3:06 video was decoded throughout and reviewed as sequential frame samples, including the closing interaction. No audio transcription was performed. Its visible workflow shows:

| Approximate point | Visible behavior | Implemented equivalent |
|---|---|---|
| 0:00–0:40 | Empty Log Customer Complaint form and copilot | Editable draft and copilot |
| 0:40–1:00 | Pharmacy complaint populates the form | New text intake and Groq/demo extraction |
| 1:00–1:40 | Product, quantity, facility, defect and risk review | Grouped form sections, severity and next action |
| 1:40–1:55 | Conversational batch/quantity correction | Explicit correction operation preserving other fields |
| 2:00–2:40 | PDF upload replaces form with Metformin API report | Text PDF parser and fresh draft; Critical foreign-matter signal |
| 2:45–3:06 | Further PDF-derived batch/quantity correction | Same correction operation for document-derived drafts |

The screenshot also shows source/customer information, reset, and save controls. These are included. The reference sometimes displays values absent from the visible input; this implementation leaves unknown fields blank. The reference's commit control is extended into a persistent ledger and investigation lifecycle.

## Requirement coverage

| Assignment requirement | Implementation |
|---|---|
| React UI | TypeScript React components; responsive layout |
| Redux state management | Redux Toolkit stores draft, messages, assessment, busy/error state, review status and records |
| Python FastAPI | Typed intake, upload, assessment, commit, list and status endpoints |
| LangGraph | Compiled extract → assess → respond graph invoked for each intake |
| Groq LLM | Server-side Groq SDK with JSON object output and Pydantic validation |
| Requested models | Both unavailable for the current Groq account; user-approved `openai/gpt-oss-120b` replacement, configurable |
| PostgreSQL or MySQL | PostgreSQL with SQLAlchemy and psycopg; no SQLite fallback |
| Google Inter | Loaded in frontend/index.html with a local sans-serif fallback |
| PDF/email/prompt → form | Text PDF, EML, pasted report and deterministic sample |
| Conversational correction | Current draft passed with explicit correction operation |
| Risk assessment | Transparent keyword triage, priority, rationale and next action |
| Optional tools | Completeness, exact duplicate hints, summary, investigation hypotheses, CAPA templates |
| Repository and two videos | Repository source and two 5–10 minute recording scripts; user records/uploads final videos |

## Why explicit operations?

A new document replaces an old complaint, while a correction changes the same complaint. Relying solely on LLM intent classification could accidentally overwrite an existing draft. The UI carries an explicit `new`, `correct`, or `question` operation. Uploads always mean new intake. Questions do not mutate fields. This is a deliberate, visible product choice.

## Data model and consistency

Each PostgreSQL record has a generated ID, unique request ID, UTC creation time, lifecycle status, JSON complaint, JSON assessment, and JSON activity trail. All human-reviewed submissions are validated again server-side. Required field checks cannot be bypassed just by enabling a frontend button. A repeated identical request ID returns the same record; reusing it for different data conflicts. Status updates lock the row, enforce allowed transitions and append an audit event in one transaction.

The structured draft is the current source of truth; the description remains reported narrative and may contain older values following a correction. Reviewers should reconcile any inconsistency before commit. Summary and duplicate checks use the current structured fields. Saving recalculates the rule-based assessment server-side. Manual frontend edits discard the old assessment and review checkmark, so the user must reassess before saving through the UI.

No automatic cross-session LangGraph checkpoint is used. Current draft context is passed explicitly from Redux on every request. This keeps state ownership simple but means uncommitted drafts and conversations disappear on reload. Source documents are parsed in memory and are not archived. Database tables are created at startup for this fixed prototype schema; production evolution requires migrations.

## Extraction and trust boundaries

Groq receives the current draft, operation, and input evidence. The system message specifies the schema, prohibits fabricated facts, and treats document instructions as untrusted content. Pydantic rejects unsupported keys or invalid value types. This is an engineering boundary, not proof that prompt injection or hallucination is impossible. Human review remains necessary.

The deterministic demo parser understands labeled reports and a limited set of natural-language corrections. It is intentionally not marketed as general language understanding. Malformed, oversized, blank and scanned PDFs fail with a clear error. Live service errors are masked to avoid exposing SDK internals or complaint text, while the user retains the draft.

## Model decision and source references

Groq's official [deprecation documentation](https://console.groq.com/docs/deprecations) records Gemma 2 retirement on 8 October 2025 and Llama 3.3 retirement for free/developer usage on 16 August 2026. On 12 September, the supplied key authenticated successfully but the Llama request returned 404. The account's model list included `openai/gpt-oss-120b`; the user approved that replacement, and live intake/correction passed. Credentials remain only in the ignored local `.env`.

Graph construction follows [LangGraph's Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api): shared typed state, named nodes, edges, compile, then invoke. Each response includes the completed node trace. The UI shows actual request activity; it does not invent percent-complete progress.

## Deliberate limitations and next engineering steps

1. Add authenticated reviewers and role checks before sharing the API across a network.
2. Preserve source evidence and per-field provenance, with appropriate access controls and retention.
3. Replace keyword triage with a validated, evaluated domain policy; handle negation and uncertainty explicitly.
4. Add migrations, versioned audit records, optimistic concurrency for draft editing, and server-side pagination beyond 500 records.
5. Evaluate live extraction against a labeled complaint set, including missing data, conflicting corrections, malicious document instructions, and uncommon formulations.
6. Add image OCR only after the text-based workflow is proven; do not hide OCR errors by guessing missing fields.
