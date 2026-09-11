# Demo video scripts and screenplay

Prepare **two separate recordings**, approximately **7 minutes each**, matching the assignment's product demonstration and end-to-end code walkthrough. Timings include screen actions and short pauses. Rehearse once and keep each finished video between 5 and 10 minutes.

## Before recording

- Start PostgreSQL, FastAPI, and Vite using the README. Set the browser to 1440×900 or 1512×982, at 100% zoom. Use a visible pointer and slow scrolling.
- Keep the repository and editor ready. Open `App.tsx`, `store.ts`, `models.py`, `main.py`, `agent.py`, and `database.py` in that order.
- Open `samples/api-complaint.pdf` and `samples/complaint.eml` in a file picker folder. Use fictional examples only.
- Add your Groq key to `backend/.env`, set `AI_MODE=live`, restart the backend, and verify the top-right badge says **Live Groq** if you want to demonstrate actual LLM extraction. Never show the real `.env` on camera. Show `.env.example` in the code walkthrough.
- If the key is not configured, keep demo mode and use the exact demo disclosure below. Do not describe deterministic extraction as a live model call.
- Record microphone narration and screen. Webcam is optional. Hide notifications and bookmarks containing personal information.
- Use a fresh disposable demo database if you want an empty ledger. Otherwise, existing fictional records are fine; identify your newest record by ID.

## Video 1 — Product demonstration

**Suggested title:** “AIVOA Customer Complaint Copilot — Product Demo”

### Scene 1 · 0:00–0:40 · Establish the problem

**Picture / screenplay:** Start on the complaint intake page. Keep the whole workspace visible, then move the pointer from the form to the copilot. Briefly highlight the mode badge.

**Narration:**

“Hello, I’m Darain. This is my AIVOA customer complaint management assignment for pharmaceutical API and finished dosage form manufacturing. The goal is to turn an incoming customer report into a structured complaint that a quality reviewer can verify and track. The form is on the left, and the intake copilot is on the right. The workflow is capture, review and assess, then commit to the QMS ledger.”

**Choose the truthful mode line:**

- Live: “This session uses Groq for extracting complaint details and applying language-based corrections. Risk guidance and the supporting checks are transparent local rules.”
- Demo: “This session is in the labeled demo mode. Extraction uses local parsing through the same LangGraph workflow. Live Groq is implemented and can be enabled with a server-side API key.”

### Scene 2 · 0:40–1:35 · Intake and structured extraction

**Picture:** Click **Discolored capsules**. Allow the request to finish. Scroll the form slowly from origin to batch and dates. Open **View workflow trace** in the copilot.

**Narration:**

“I’ll begin with a fictional pharmacy report about discolored Amoxicillin capsules. This sample includes source, customer, product, strength, batch, quantity, dates, facility information and a defect description. When I send it, the backend processes the report and returns structured values. Those values update the form and the assistant response together.

“Here are Apollo Pharmacy, Amoxicillin Capsules at 500 milligrams, batch AMX240602, and twelve affected capsules. Every field remains editable. The workflow trace shows extraction and validation, risk and completeness assessment, and response composition. These are actual completed steps, rather than simulated progress percentages.”

### Scene 3 · 1:35–2:20 · Correct the complaint

**Picture:** Use **Correct current draft**. Paste and send:

```text
Sorry the batch number is BMX240602 and affected quantity is 48 capsules
```

Show the two changed fields and the unchanged customer/product fields. Pause for 3 seconds on each.

**Narration:**

“The next interaction follows the reference video: the customer corrects the batch and affected quantity. I’m explicitly using correction mode so this is treated as an update to the current complaint. The batch is now BMX240602 and the quantity is forty-eight capsules. The customer, product and other reported details are preserved.

“This distinction matters: a correction updates a complaint, while a new report replaces the draft. The assistant also tells me which fields changed. The source narrative may still contain the originally reported quantity, so a reviewer should reconcile the description with the latest structured fields before saving.”

**Action:** Edit the description to replace “12” with “48,” then click **Assess draft**. Explain that manual edits invalidate the previous assessment and review checkmark.

### Scene 4 · 2:20–3:20 · Review risk and the supporting tools

**Picture:** Scroll to **AI Copilot risk assessment**. Expand **Summary, root cause hypotheses & CAPA**. Switch copilot mode to **Ask about this complaint** and send `What CAPA is suggested?`.

**Narration:**

“Discoloration receives a suggested Major classification and High priority under the prototype’s rule-based triage policy. The suggested next action is to route the complaint to quality assurance, obtain samples and inspect batch documentation. This is support for the reviewer, not an automatic disposition of the batch.

“The completeness check measures whether six key fields are present. One hundred percent does not mean the evidence is correct or the investigation is complete. The expanded panel contains a current summary, investigation hypotheses, and CAPA starting points. These are hypotheses to verify, not confirmed root causes. Asking about CAPA returns the relevant guidance without changing any complaint facts.”

**Optional visible check:** Clear Quantity, assess, show the missing-field message and disabled commit, then restore `48 capsules` and reassess. Budget 15 seconds here.

### Scene 5 · 3:20–4:20 · Human review and persistent ledger

**Picture:** Enter `Darain — Demo QA` in Reviewer name. Check the review box. Click **Commit to QMS ledger**. Note the returned ID. Refresh the page, click **QMS ledger**, and search for `BMX240602`. Open **View**.

**Narration:**

“Once the details have been checked, I enter the reviewer name and confirm review. The backend independently checks required fields before saving. The complaint receives an ID and appears in the ledger. I’ll refresh the page to show this is persisted in PostgreSQL, rather than just retained in the browser.

“The record includes structured complaint details, its assessment and an activity trail. I can start an investigation by adding a meaningful note. Closing is only available after investigation has started. These reviewer names are prototype labels; authentication and electronic signatures are future production work.”

**Action:** Add `Retain samples requested; packaging records under QA review.` and click **Start investigation**. Point out the new activity entry. Close the record panel.

### Scene 6 · 4:20–5:00 · Duplicate awareness

**Picture:** Click **New complaint**, then the sample. Apply the same batch correction to `BMX240602`. Scroll to the potential-duplicate warning.

**Narration:**

“Another report for the same product and batch raises a potential-duplicate warning. The lookup checks the committed ledger. It is intentionally a hint based on exact product and batch matching: two independent customer incidents could concern the same batch. The application does not silently merge them or discard the second report. I can review the existing record before deciding whether a new complaint is warranted.”

### Scene 7 · 5:00–6:15 · PDF intake and API contamination

**Picture:** Click **Upload a complaint document** and select `samples/api-complaint.pdf`. Show product, customer, quantity, blank expiry and Critical assessment. In correction mode, send:

```text
The batch number is CHG260712A and affected quantity is 50 kg (2 HDPE drums)
```

**Narration:**

“Now I’ll upload a different complaint as a PDF. This fictional report concerns Metformin Hydrochloride API supplied in an HDPE drum. Uploading is a new intake, so it replaces the previous draft. The parser reads the text from the PDF, and the same graph populates the form.

“The reported foreign particles produce a Critical triage signal and an urgent QA escalation suggestion. Notice that the expiry date remains blank because it was not reported. The system should expose missing evidence instead of filling gaps with invented values.

“I can correct a document-derived complaint in the same way as a pasted report. Here, the batch and quantity change while the rest of the draft stays available for review. The implementation supports readable PDFs and plain-text email files. A scanned PDF without extractable text produces an error asking for pasted text; OCR is not hidden behind a fake success.”

### Scene 8 · 6:15–7:10 · Email, export and close

**Picture:** Upload `samples/complaint.eml`, briefly show the resulting form. Go to the ledger, open the saved record, add a closure note and close it if desired. Click **Export record JSON**. End on the GitHub README with the stack and setup steps visible.

**Narration:**

“The same upload flow accepts a plain-text email file. Email parsing selects the text body and passes it into the existing intake process. The frontend also supports search, responsive layouts, validation errors and record export. Exporting includes the complaint, assessment and activity history in JSON.

“The source repository contains React with Redux Toolkit, a Python FastAPI backend, a real LangGraph workflow, configurable Groq extraction, PostgreSQL persistence, example complaints and automated tests. The important boundary is that AI assists with intake while quality decisions stay reviewable. The README also documents the demo mode, model choice, setup instructions and prototype limitations. Thank you for watching.”

## Video 2 — End-to-end code walkthrough

**Suggested title:** “AIVOA Complaint Copilot — React to LangGraph to PostgreSQL”

### Scene 1 · 0:00–0:45 · Establish the architecture

**Picture:** Open the README architecture diagram in GitHub or the editor preview. Point along UI → Redux → API → LangGraph → UI → review → database.

**Narration:**

“In this second video, I’ll trace one complaint from user input through the application and into the final form and QMS ledger. React renders the interface, Redux Toolkit owns the draft state, FastAPI handles input and file parsing, LangGraph coordinates extraction and assessment, and PostgreSQL stores committed complaints. I’ll also show the separation between live Groq extraction and deterministic demo behavior, so it is clear which operations call a language model.”

### Scene 2 · 0:45–1:40 · Frontend input and Redux

**Picture:** Open `frontend/src/App.tsx`. Find `async function send` and `async function upload`. Then open `store.ts`; show `begin`, `complete`, `edit` and `api`. Use Find rather than scrolling quickly.

**Narration:**

“The send function collects the message, current draft and explicit operation. It dispatches the beginning of the request, then posts to the intake endpoint. On success, the complete action stores the returned complaint, assessment, duplicate hints, trace and assistant message.

“Because the form values come from Redux, the form and copilot update from one response. Manual editing dispatches the edit action. That action invalidates the assessment and reviewer checkbox; otherwise the screen could show a risk evaluation that belonged to older data. Errors leave the existing draft in place. The busy flag prevents competing edits while the current request is processing.

“Uploads use FormData and the upload endpoint. Once parsed, they converge on the same intake pipeline.”

### Scene 3 · 1:40–2:30 · API schemas and document parsing

**Picture:** Open `backend/app/models.py`; show `Complaint`, `Intake`, and `Commit`. Open `main.py`; show `/api/intake` and `/api/upload`.

**Narration:**

“The models define bounded strings for complaint fields and restrict intake operations to new, correct or question. Unsupported extracted properties are rejected rather than silently added to the record. A commit also requires a reviewer label, a review flag and a unique request ID.

“For PDFs, the upload endpoint reads text with pypdf. For email, it selects the plain-text body. It rejects unsupported formats, unreadable content, oversized files, too many PDF pages and excessively long extracted text. The parser does not claim to do OCR. After parsing, it creates an intake request and invokes the same function used for pasted text. That avoids separate business logic for every source format.”

### Scene 4 · 2:30–3:45 · LangGraph and live extraction

**Picture:** Open `backend/app/agent.py`. Show `State`, the `extract` function, Groq messages, and the graph construction at the bottom. Show `.env.example`, never `.env`.

**Narration:**

“This is the actual LangGraph definition. State carries the input text, current complaint, operation, validated output, assessment and trace. The graph has three nodes: extract, assess and respond. I connect start to extract, then assess, then respond, and compile the graph before invoking it.

“In live mode, extraction uses the Groq SDK with a low-variance configuration and JSON object output. The prompt specifies the complaint schema, asks for empty strings when facts are missing, and tells the model to treat the evidence as data rather than instructions. The returned JSON is validated again with Pydantic. These measures reduce failure modes, but do not remove the need for human review.

“The model is configurable. The brief requested Gemma 2 but allowed Llama 3.3; Groq retired the Gemma model, so the default is the permitted Llama alternative. The key belongs in the backend environment file. In demo mode, the extract node uses labeled text and a limited regex parser. Both modes still execute the same graph.”

### Scene 5 · 3:45–4:45 · Assessment, corrections and response mapping

**Picture:** Show `demo_extract`, `assess_complaint`, `assess`, and `respond`. Then return briefly to the running app and correct batch/quantity.

**Narration:**

“Correction mode starts with current values and changes the explicitly provided fields. New intake starts from an empty complaint. Question mode preserves the current draft. In the demo adapter, those behaviors can be inspected directly; in live mode, the current complaint and operation are part of the model request.

“The assessment function is a transparent policy, not another LLM call. It checks reported signals, assigns a provisional severity and priority, identifies missing required fields, and supplies investigation and CAPA starting points. Unknown reports remain Needs review. The keyword approach can overflag a negated signal, which is documented as a limitation.

“The response node creates a change message or answers a supported question from the assessment. FastAPI returns the result, and Redux populates the form and risk panel. That completes the frontend-to-backend-to-frontend loop.”

### Scene 6 · 4:45–5:45 · Database, idempotency and lifecycle

**Picture:** Show `database.py`, then the POST and PATCH complaint endpoints in `main.py`. Point at unique `request_id`, the validation checks, the transaction and activity append.

**Narration:**

“Draft processing does not automatically save a complaint. The commit endpoint checks review and required fields, recalculates the assessment from submitted facts, and inserts a PostgreSQL record. The unique request ID makes identical retries return the same record, avoiding accidental duplicate commits from a repeated request.

“The record stores structured complaint information, the assessment and an activity list. Duplicate detection queries existing records for the same product and batch. Status updates lock the record, enforce Open to Under investigation to Closed, and append the reviewer’s note in the same transaction.

“This prototype has an activity trail, not a compliant immutable audit system. It also does not authenticate the entered reviewer name. Those are explicit production gaps, rather than features I’m claiming to have built.”

### Scene 7 · 5:45–6:40 · Tests and failure handling

**Picture:** Show `backend/tests/test_workflow.py`, then run the full documented PostgreSQL test command. Show `frontend/e2e/workflow.spec.ts` and the frontend build command. Open the GitHub Actions workflow or its latest successful run.

**Narration:**

“The automated tests exercise missing information, correction preservation, new-draft replacement, question behavior, risk triage, reviewed commits, duplicate hints, idempotency, valid status transitions, uploads and the missing-key failure. Database tests use a dedicated database whose name ends in test, and the fixture refuses to clear the normal application database.

“The browser smoke test exercises the actual interface: sample intake, correction, commit, reload, investigation and PDF intake. It also checks a mobile viewport for horizontal overflow and collects JavaScript errors. The TypeScript and Vite build validates the frontend compilation. CI repeats the backend tests against PostgreSQL and builds the frontend on pushes.”

**Recording rule:** Show the current results. If a command fails during recording, diagnose it or disclose the failure; do not narrate a green result over a failing screen.

### Scene 8 · 6:40–7:20 · Engineering tradeoffs and close

**Picture:** Open `docs/ARCHITECTURE.md`, then return to the populated complaint form. Finish with the repository link.

**Narration:**

“My main design choices are explicit draft ownership in Redux, one intake pipeline across source formats, schema validation around live extraction, and a human review boundary before persistence. I kept unknown details empty and made the demo mode visible.

“The next steps would be authenticated users, stored source evidence and provenance, database migrations, more robust duplicate matching, and a labeled evaluation set for real Groq extraction. Risk policy would need domain validation before operational use. The current implementation covers the reference workflow with a runnable application, tests, documentation and a clear path for extension. Thank you.”

## Recording and submission checklist

- Export two MP4 files, ideally 1080p, named `01-aivoa-product-demo.mp4` and `02-aivoa-code-walkthrough.mp4`.
- Confirm each is 5–10 minutes, audio is intelligible, form values are readable and the pointer moves slowly.
- Do not expose API keys, personal browser tabs, or unrelated private repository details.
- Make video links accessible to the evaluator. The code repository is public.
- Submit the repository and the two finished video links through the assignment form yourself. The app build does not automatically submit that form.
- Repository: https://github.com/darain24/aivoa-complaint-copilot
