import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  actions,
  api,
  json,
  type RootState,
  type Result,
  type LedgerRecord,
  type Assessment,
} from "./store";
const sample = `Source: Pharmacy
Customer: Apollo Pharmacy
Product: Amoxicillin Capsules
Strength: 500 mg
Batch: AMX240602
Quantity: 12 capsules
Manufacturing date: March 2026
Expiry date: February 2028
Site: FDF Manufacturing - Block B
Materials: Primary packaging (bottle)
Category: Discoloration
Description: Apollo Pharmacy reported 12 discolored capsules in a sealed bottle. Please investigate the quality defect and arrange a response.`;
const groups = [
  {
    title: "Origin & customer",
    fields: [
      ["source", "Complaint source *"],
      ["customer", "Customer name *"],
    ],
  },
  {
    title: "Product & batch identification",
    fields: [
      ["product", "Product name (API / FDF) *"],
      ["strength", "Strength / grade"],
      ["batch", "Batch / lot number *"],
      ["quantity", "Affected quantity *"],
      ["manufacturing_date", "Manufacturing date"],
      ["expiry_date", "Expiry date"],
    ],
  },
  {
    title: "Facility & material impact",
    fields: [
      ["site", "Originating site / block"],
      ["materials", "Impacted non-product materials"],
    ],
  },
  {
    title: "Defect analysis",
    fields: [
      ["category", "Complaint category"],
      ["description", "Complaint description *"],
    ],
  },
];
export default function App() {
  const s = useSelector((s: RootState) => s.complaints);
  const dispatch = useDispatch();
  const [tab, setTab] = useState("intake"),
    [prompt, setPrompt] = useState(""),
    [operation, setOperation] = useState("new"),
    [reviewer, setReviewer] = useState(""),
    [health, setHealth] = useState<{ ai_mode: string; model: string } | null>(
      null,
    ),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<LedgerRecord | null>(null),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api<{ ai_mode: string; model: string }>("/health")
      .then(setHealth)
      .catch(() =>
        dispatch(
          actions.fail(
            "Backend unavailable. Start the API and PostgreSQL, then reload.",
          ),
        ),
      );
  }, [dispatch]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [s.messages, s.busy]);
  async function loadRecords() {
    try {
      dispatch(actions.records(await api<LedgerRecord[]>("/complaints")));
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
  }
  useEffect(() => {
    if (tab === "ledger") void loadRecords();
  }, [tab]);
  async function send(text = prompt, op = operation) {
    if (!text.trim() || s.busy) return;
    dispatch(actions.begin(text));
    setPrompt("");
    try {
      dispatch(
        actions.complete(
          await api<Result>(
            "/intake",
            json({ text, current: s.draft, operation: op }),
          ),
        ),
      );
      if (op === "new") setOperation("correct");
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
  }
  async function upload(file?: File) {
    if (!file || s.busy) return;
    if (file.size > 10 * 1024 * 1024) {
      dispatch(actions.fail("Maximum file size is 10 MB."));
      return;
    }
    dispatch(actions.begin("Uploaded " + file.name));
    const body = new FormData();
    body.append("file", file);
    try {
      dispatch(
        actions.complete(
          await api<Result>("/upload", { method: "POST", body }),
        ),
      );
      setOperation("correct");
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  async function assess() {
    dispatch(actions.setBusy(true));
    try {
      dispatch(
        actions.assessed(
          await api<{
            assessment: Assessment;
            duplicates: Result["duplicates"];
          }>("/assess", json(s.draft)),
        ),
      );
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
  }
  async function commit() {
    dispatch(actions.setBusy(true));
    try {
      const record = await api<LedgerRecord>(
        "/complaints",
        json({
          complaint: s.draft,
          reviewed: s.reviewed,
          reviewer,
          request_id: s.requestId,
        }),
      );
      dispatch(actions.reset());
      setNotice(`${record.id} committed to the QMS ledger.`);
      setTab("ledger");
      setOperation("new");
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
  }
  async function update() {
    if (!selected) return;
    dispatch(actions.setBusy(true));
    try {
      const record = await api<LedgerRecord>("/complaints/" + selected.id, {
        ...json({
          status: selected.status === "Open" ? "Under investigation" : "Closed",
          note,
          reviewer,
        }),
        method: "PATCH",
      });
      setSelected(record);
      setNote("");
      await loadRecords();
      dispatch(actions.setBusy(false));
    } catch (e) {
      dispatch(actions.fail((e as Error).message));
    }
  }
  function exportRecord(r: LedgerRecord) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = r.id + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const filtered = s.records.filter((r) =>
    JSON.stringify([
      r.id,
      r.complaint.product,
      r.complaint.batch,
      r.complaint.customer,
      r.status,
    ])
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("intake");
          }}
        >
          <span className="brandmark">
            <FlaskConical size={23} />
          </span>
          aivoa<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">Q</span>
          <div>
            Quality workspace<small>API & FDF manufacturing</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <button
            className={tab === "intake" ? "active" : ""}
            onClick={() => setTab("intake")}
          >
            <MessageSquareText size={18} /> Complaint intake{" "}
            <span className="nav-count">AI</span>
          </button>
          <button
            className={tab === "ledger" ? "active" : ""}
            onClick={() => setTab("ledger")}
          >
            <ClipboardList size={18} /> QMS ledger
          </button>
        </nav>
        <div className="side-note">
          <ShieldCheck size={22} />
          <strong>
            Better quality starts
            <br />
            with better context.
          </strong>
          <p>
            Capture the evidence.
            <br />
            Keep people in control.
          </p>
        </div>
        <div className="profile">
          <span>QA</span>
          <div>
            Quality reviewer<small>Demo workspace</small>
          </div>
          <span className="online" />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            Quality management <ChevronRight size={14} />{" "}
            <strong>Customer complaints</strong>
          </div>
          <div className="environment">
            <span className={health ? "online" : "offline"} />
            {health
              ? health.ai_mode === "live"
                ? "Live Groq"
                : "Demo mode · no LLM"
              : "Connecting…"}
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                CUSTOMER QUALITY /{" "}
                {tab === "intake" ? "NEW COMPLAINT" : "RECORDS"}
              </div>
              <h1>
                {tab === "intake"
                  ? "Every complaint. A clearer picture."
                  : "Your quality record, connected."}
              </h1>
              <p>
                {tab === "intake"
                  ? "Turn customer reports into structured, reviewable quality records."
                  : "Track complaints from first report through investigation and closure."}
              </p>
            </div>
            <button
              className="secondary"
              disabled={s.busy}
              onClick={() => {
                dispatch(actions.reset());
                setTab("intake");
                setOperation("new");
                setNotice("");
              }}
            >
              <Plus size={16} /> New complaint
            </button>
          </div>
          {s.error && (
            <div role="alert" className="error">
              {s.error}
              <button
                aria-label="Dismiss error"
                onClick={() => dispatch(actions.fail(""))}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              <Check size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "intake" ? (
            <>
              <div className="steps">
                <div className="step active">
                  <span>01</span> Capture complaint
                </div>
                <div className={"step " + (s.assessment ? "active" : "")}>
                  <span>02</span> Review & assess
                </div>
                <div className="step">
                  <span>03</span> Commit to ledger
                </div>
                <div className="steps-note">
                  <ShieldCheck size={14} /> Human review required
                </div>
              </div>
              <div className="intake-grid">
                <section className="card form-card">
                  <div className="card-heading">
                    <div>
                      <h2>Log customer complaint</h2>
                      <p>One complete record. All the details that matter.</p>
                    </div>
                    <span
                      className={
                        "badge " +
                        (s.assessment && !s.assessment.missing.length
                          ? "green"
                          : "amber")
                      }
                    >
                      {s.assessment && !s.assessment.missing.length
                        ? "Ready for review"
                        : "Draft · pending triage"}
                    </span>
                  </div>
                  <fieldset disabled={s.busy} className="form-fields">
                    {groups.map((g, i) => (
                      <section className="form-section" key={g.title}>
                        <h3>
                          <span>0{i + 1}</span>
                          {g.title}
                        </h3>
                        <div className="fields">
                          {g.fields.map(([key, label]) => (
                            <label
                              key={key}
                              className={key === "description" ? "full" : ""}
                            >
                              {label}
                              {key === "description" ? (
                                <textarea
                                  rows={3}
                                  placeholder="Describe the reported defect and its impact…"
                                  value={s.draft[key]}
                                  onChange={(e) =>
                                    dispatch(
                                      actions.edit({
                                        key,
                                        value: e.target.value,
                                      }),
                                    )
                                  }
                                />
                              ) : (
                                <input
                                  placeholder="Not yet provided"
                                  value={s.draft[key]}
                                  onChange={(e) =>
                                    dispatch(
                                      actions.edit({
                                        key,
                                        value: e.target.value,
                                      }),
                                    )
                                  }
                                />
                              )}
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                  </fieldset>
                  <div className="risk">
                    <div className="risk-title">
                      <ShieldCheck size={19} />
                      <h3>AI Copilot risk assessment</h3>
                      <span>QA DECISION SUPPORT</span>
                    </div>
                    {s.assessment ? (
                      <>
                        <div className="risk-row">
                          <div>
                            <small>SUGGESTED SEVERITY</small>
                            <strong
                              className={
                                s.assessment.severity === "Critical"
                                  ? "critical"
                                  : ""
                              }
                            >
                              {s.assessment.severity}
                              <span className="badge amber">
                                {s.assessment.priority}
                              </span>
                            </strong>
                          </div>
                          <div className="completeness">
                            <small>RECORD COMPLETENESS</small>
                            <strong>
                              {s.assessment.completeness}%
                              <span className="meter">
                                <i
                                  style={{
                                    width: s.assessment.completeness + "%",
                                  }}
                                />
                              </span>
                            </strong>
                          </div>
                        </div>
                        <p>{s.assessment.rationale}</p>
                        <div className="next-action">
                          <ArrowRight size={16} />
                          {s.assessment.action}
                        </div>
                        {s.assessment.missing.length > 0 && (
                          <p className="missing">
                            Missing: {s.assessment.missing.join(", ")}
                          </p>
                        )}
                        <details>
                          <summary>
                            Summary, root cause hypotheses & CAPA
                          </summary>
                          <p>{s.assessment.summary}</p>
                          <b>Investigate</b>
                          <ul>
                            {s.assessment.root_cause.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                          <b>Suggested CAPA</b>
                          <ul>
                            {s.assessment.capa.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </details>
                        <small className="disclaimer">
                          {s.assessment.disclaimer}
                        </small>
                      </>
                    ) : (
                      <p>
                        Add complaint details, then assess the draft to see
                        triage guidance.
                      </p>
                    )}
                    <button
                      className="text-button"
                      onClick={assess}
                      disabled={s.busy || !s.draft.description}
                    >
                      <RotateCcw size={13} />{" "}
                      {s.assessment ? "Refresh assessment" : "Assess draft"}
                    </button>
                  </div>
                  {s.duplicates.length > 0 && (
                    <div className="duplicate">
                      <Layers3 size={17} />
                      <div>
                        <strong>Potential duplicate detected</strong>
                        <p>
                          Same product and batch:{" "}
                          {s.duplicates.map((d) => d.id).join(", ")}. Review the
                          ledger before creating another record.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="review-box">
                    <label>
                      Reviewer name
                      <input
                        value={reviewer}
                        onChange={(e) => setReviewer(e.target.value)}
                        placeholder="Your name"
                        disabled={s.busy}
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={s.reviewed}
                        disabled={s.busy || !s.assessment}
                        onChange={(e) =>
                          dispatch(actions.review(e.target.checked))
                        }
                      />{" "}
                      I reviewed the complaint details and triage suggestions.
                    </label>
                  </div>
                  <div className="form-footer">
                    <span>
                      <ShieldCheck size={14} /> Saved only after your review
                    </span>
                    <button
                      className="primary"
                      disabled={
                        s.busy ||
                        !s.reviewed ||
                        reviewer.trim().length < 2 ||
                        !s.assessment ||
                        s.assessment.missing.length > 0
                      }
                      onClick={commit}
                    >
                      Commit to QMS ledger <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <aside className="copilot card">
                  <div className="copilot-heading">
                    <div className="spark">
                      <Sparkles size={21} />
                    </div>
                    <div>
                      <h2>AIVOA Copilot</h2>
                      <p>Your complaint intake partner</p>
                    </div>
                    <span className="online" />
                  </div>
                  <div className="copilot-label">
                    <span>ASSISTED INTAKE</span>
                    <span>POWERED BY LANGGRAPH</span>
                  </div>
                  <div className="chat" aria-live="polite">
                    {s.messages.map((m, i) => (
                      <div key={i} className={"message " + m.role}>
                        {m.role === "assistant" && (
                          <div className="message-avatar">
                            <Sparkles size={14} />
                          </div>
                        )}
                        <div className="bubble">{m.text}</div>
                      </div>
                    ))}
                    {s.busy && (
                      <div className="processing">
                        <LoaderCircle size={16} className="spin" /> Processing
                        request…
                      </div>
                    )}
                    <div ref={chatEnd} />
                  </div>
                  {s.messages.length === 1 && (
                    <div className="quick-start">
                      <span>TRY A SAMPLE COMPLAINT</span>
                      <button
                        onClick={() => send(sample, "new")}
                        disabled={s.busy}
                      >
                        <div className="sample-icon">
                          <FlaskConical size={19} />
                        </div>
                        <div>
                          <strong>Discolored capsules</strong>
                          <small>FDF · Pharmacy report</small>
                        </div>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <div
                    className="upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void upload(e.dataTransfer.files[0]);
                    }}
                  >
                    <button
                      disabled={s.busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={18} />
                      <strong>Upload a complaint document</strong>
                      <small>
                        Drop here or browse · PDF, TXT, EML, CSV · 10 MB
                      </small>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.txt,.eml,.csv"
                      hidden
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </div>
                  <div className="composer">
                    <div className="composer-mode">
                      <select
                        aria-label="Message mode"
                        value={operation}
                        disabled={s.busy}
                        onChange={(e) => setOperation(e.target.value)}
                      >
                        <option value="new">New complaint</option>
                        <option value="correct">Correct current draft</option>
                        <option value="question">
                          Ask about this complaint
                        </option>
                      </select>
                    </div>
                    <textarea
                      aria-label="Message to copilot"
                      value={prompt}
                      disabled={s.busy}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        operation === "correct"
                          ? "e.g. The batch number is BMX240602 and affected quantity is 48 capsules"
                          : "Paste a complaint or ask a question…"
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                    />
                    <div className="composer-bottom">
                      <span>⌘ / Ctrl + Enter to send</span>
                      <button
                        className="send"
                        aria-label="Send message"
                        disabled={s.busy || !prompt.trim()}
                        onClick={() => send()}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="copilot-bottom">
                    {health?.ai_mode === "live"
                      ? "Groq extraction · rule-based risk guidance"
                      : "Demo extraction · rule-based guidance"}
                    <span>Always verify before committing.</span>
                  </div>
                  {s.trace.length > 0 && (
                    <details className="trace">
                      <summary>View workflow trace</summary>
                      {s.trace.map((t, i) => (
                        <div key={t}>
                          <Check size={12} /> {i + 1}. {t.replaceAll("_", " ")}
                        </div>
                      ))}
                    </details>
                  )}
                </aside>
              </div>
            </>
          ) : (
            <section className="ledger">
              <div className="stats">
                <div>
                  <small>TOTAL RECORDS</small>
                  <strong>{s.records.length}</strong>
                  <span>In your QMS ledger</span>
                </div>
                <div>
                  <small>AWAITING INVESTIGATION</small>
                  <strong>
                    {s.records.filter((r) => r.status === "Open").length}
                  </strong>
                  <span>Ready for QA triage</span>
                </div>
                <div>
                  <small>CRITICAL COMPLAINTS</small>
                  <strong>
                    {
                      s.records.filter(
                        (r) =>
                          r.assessment.severity === "Critical" &&
                          r.status !== "Closed",
                      ).length
                    }
                  </strong>
                  <span>Open patient-safety signals</span>
                </div>
              </div>
              <div className="card">
                <div className="ledger-header">
                  <h2>
                    Complaint register{" "}
                    <span className="badge green">
                      {filtered.length} records
                    </span>
                  </h2>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search ledger"
                      placeholder="Search product, batch, customer…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>COMPLAINT</th>
                        <th>PRODUCT / BATCH</th>
                        <th>CUSTOMER</th>
                        <th>SEVERITY</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.id}</strong>
                            <small>
                              {new Date(r.created_at).toLocaleDateString()}
                            </small>
                          </td>
                          <td>
                            {r.complaint.product}
                            <small>{r.complaint.batch}</small>
                          </td>
                          <td>{r.complaint.customer}</td>
                          <td>
                            <span
                              className={
                                "badge " +
                                (r.assessment.severity === "Critical"
                                  ? "red"
                                  : "amber")
                              }
                            >
                              {r.assessment.severity}
                            </span>
                          </td>
                          <td>{r.status}</td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => {
                                setSelected(r);
                                setNote("");
                              }}
                            >
                              View <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty">
                      <ClipboardList size={32} />
                      <h3>
                        {search
                          ? "No matching complaints"
                          : "A clean slate for quality."}
                      </h3>
                      <p>
                        {search
                          ? "Try a different product, batch, or customer."
                          : "Create and review your first complaint to start the ledger."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Activity size={13} /> AIVOA QUALITY WORKSPACE
            </span>
            <span>Evidence first. Human judgment always.</span>
          </footer>
        </div>
      </main>
      {selected && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Complaint record"
          >
            <div className="modal-heading">
              <div>
                <small>COMPLAINT RECORD</small>
                <h2>{selected.id}</h2>
              </div>
              <button
                aria-label="Close record"
                disabled={s.busy}
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <div className="badge green">{selected.status}</div>
            <h3>
              {selected.complaint.product} · {selected.complaint.batch}
            </h3>
            <p>{selected.complaint.description}</p>
            <dl className="record-details">
              {Object.entries(selected.complaint)
                .filter(([k]) => k !== "description")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replaceAll("_", " ")}</dt>
                    <dd>{v || "Not provided"}</dd>
                  </div>
                ))}
            </dl>
            <div className="risk">
              <strong>
                {selected.assessment.severity} · {selected.assessment.priority}
              </strong>
              <p>{selected.assessment.rationale}</p>
              <p>{selected.assessment.action}</p>
            </div>
            <h3>Activity trail</h3>
            {selected.audit.map((a, i) => (
              <div className="audit" key={i}>
                <Check size={15} />
                <div>
                  <strong>{a.event}</strong>
                  <small>
                    {a.actor} · {new Date(a.at).toLocaleString()}
                  </small>
                  {a.note && <p>{a.note}</p>}
                </div>
              </div>
            ))}
            {selected.status !== "Closed" && (
              <div className="status-form">
                <label>
                  Reviewer
                  <input
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    disabled={s.busy}
                  />
                </label>
                <label>
                  Investigation / closure note
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={s.busy}
                    placeholder="Document evidence, actions, and your decision (10+ characters)"
                  />
                </label>
                <button
                  className="primary"
                  disabled={
                    s.busy ||
                    note.trim().length < 10 ||
                    reviewer.trim().length < 2
                  }
                  onClick={update}
                >
                  {selected.status === "Open"
                    ? "Start investigation"
                    : "Close complaint"}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
            <button
              className="secondary"
              onClick={() => exportRecord(selected)}
            >
              <ArrowDownToLine size={15} /> Export record JSON
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
