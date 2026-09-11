import io
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from .agent import assess_complaint, complaint_graph
from .database import Base, Record, Session, engine, settings
from .models import Commit, Complaint, Intake, StatusUpdate


@asynccontextmanager
async def lifespan(app):
    if settings.ai_mode not in {"demo", "live"}:
        raise RuntimeError("AI_MODE must be demo or live")
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="AIVOA Complaint Copilot", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


def serialized(row):
    return dict(
        id=row.id,
        created_at=row.created_at.isoformat(),
        status=row.status,
        complaint=row.complaint,
        assessment=row.assessment,
        audit=row.audit,
    )


def duplicates(data):
    if not data.get("batch") or not data.get("product"):
        return []
    with Session() as db:
        rows = db.scalars(
            select(Record).where(
                Record.complaint["batch"].as_string() == data["batch"],
                Record.complaint["product"].as_string() == data["product"],
            )
        ).all()
        return [
            dict(id=r.id, status=r.status, category=r.complaint.get("category"))
            for r in rows
        ]


@app.get("/api/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "postgresql",
        "ai_mode": settings.ai_mode,
        "model": settings.groq_model
        if settings.ai_mode == "live"
        else "Deterministic demo (no LLM)",
    }


@app.post("/api/intake")
def intake(body: Intake):
    if not body.text.strip():
        raise HTTPException(422, "Enter complaint text.")
    try:
        result = complaint_graph.invoke(
            dict(
                text=body.text,
                current=body.current.model_dump(),
                operation=body.operation,
            )
        )
    except Exception as exc:
        # Do not leak SDK responses, credentials, or submitted complaint text.
        if isinstance(exc, ValueError) and "Live AI needs" in str(exc):
            raise HTTPException(503, str(exc)) from exc
        raise HTTPException(
            502,
            "AI extraction failed. Check the model/key or retry. Your draft has not changed.",
        ) from exc
    return {
        k: result[k] for k in ["complaint", "assessment", "message", "mode", "trace"]
    } | {"duplicates": duplicates(result["complaint"])}


@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    raw = file.file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Maximum file size is 10 MB.")
    ext = Path(file.filename or "").suffix.lower()
    try:
        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(raw))
            if len(reader.pages) > 30:
                raise HTTPException(422, "Use a PDF of 30 pages or fewer.")
            content = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext == ".eml":
            msg = BytesParser(policy=policy.default).parsebytes(raw)
            part = msg.get_body(preferencelist=("plain",))
            content = part.get_content() if part else ""
        elif ext in {".txt", ".csv"}:
            content = raw.decode("utf-8-sig")
        else:
            raise HTTPException(
                415, "Supported uploads: text-based PDF, TXT, CSV, and plain-text EML."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            422, "Could not read this document. Try a text-based PDF or paste the text."
        ) from exc
    if not content.strip():
        raise HTTPException(
            422,
            "No readable text found. Scanned PDFs require OCR; paste the text instead.",
        )
    if len(content) > 20000:
        raise HTTPException(
            422, "Document text exceeds 20,000 characters. Upload a shorter report."
        )
    return intake(Intake(text=content)) | {
        "filename": Path(file.filename or "document").name
    }


@app.post("/api/assess")
def assess(body: Complaint):
    return {
        "assessment": assess_complaint(body.model_dump()),
        "duplicates": duplicates(body.model_dump()),
    }


@app.get("/api/complaints")
def list_records():
    with Session() as db:
        return [
            serialized(r)
            for r in db.scalars(
                select(Record).order_by(Record.created_at.desc()).limit(500)
            )
        ]


@app.post("/api/complaints", status_code=201)
def commit(body: Commit):
    if not body.reviewed:
        raise HTTPException(422, "Human review is required before commit.")
    if len(body.reviewer.strip()) < 2:
        raise HTTPException(422, "Enter a reviewer name.")
    data = body.complaint.model_dump()
    assessment = assess_complaint(data)
    if assessment["missing"]:
        raise HTTPException(
            422, "Missing required fields: " + ", ".join(assessment["missing"])
        )
    with Session() as db:
        existing = db.scalar(select(Record).where(Record.request_id == body.request_id))
        if existing:
            if existing.complaint != data:
                raise HTTPException(
                    409, "This request ID was already used for a different complaint."
                )
            return serialized(existing)
        row = Record(
            id="CC-" + uuid.uuid4().hex[:10].upper(),
            request_id=body.request_id,
            complaint=data,
            assessment=assessment,
            audit=[
                {
                    "event": "Committed after human review",
                    "actor": body.reviewer.strip(),
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            ],
        )
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(
                select(Record).where(Record.request_id == body.request_id)
            )
            if existing and existing.complaint == data:
                return serialized(existing)
            raise HTTPException(409, "Conflicting submission; reload the ledger.")
        db.refresh(row)
        return serialized(row)


@app.patch("/api/complaints/{record_id}")
def update_status(record_id: str, body: StatusUpdate):
    if len(body.note.strip()) < 10 or len(body.reviewer.strip()) < 2:
        raise HTTPException(422, "Provide reviewer and meaningful investigation notes.")
    with Session() as db:
        row = db.scalar(select(Record).where(Record.id == record_id).with_for_update())
        if not row:
            raise HTTPException(404, "Complaint not found.")
        allowed = {"Open": "Under investigation", "Under investigation": "Closed"}
        if allowed.get(row.status) != body.status:
            raise HTTPException(
                409,
                "Start investigation before closing; closed records cannot be changed.",
            )
        row.status = body.status
        row.audit = row.audit + [
            {
                "event": body.status,
                "actor": body.reviewer.strip(),
                "note": body.note.strip(),
                "at": datetime.now(timezone.utc).isoformat(),
            }
        ]
        db.commit()
        db.refresh(row)
        return serialized(row)
