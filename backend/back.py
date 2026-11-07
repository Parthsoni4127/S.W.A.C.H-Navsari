from pathlib import Path
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from random import randint

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="S.W.A.C.H Navsari API",
    description="Smart Waste Action and Cleanliness Hub",
    version="1.0.0"
)

# Local development only: the Vite app may use either port while switching servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)

DATABASE_PATH = Path(__file__).with_name("swach_demo.db")
SAMPLE_REPORTS = [
    ("SW-2048", "Overflowing bin", "Lunsikui", "Community report · example record", "Crew assigned", "Today, 9:40 AM"),
    ("SW-2052", "Street litter", "Lunsikui", "Community report · example record", "Received (demo)", "Today, 8:10 AM"),
    ("SW-2055", "Missed collection", "Lunsikui", "Community report · example record", "In progress", "Today, 7:35 AM"),
    ("SW-2039", "Street litter", "Grid Road", "Community report · example record", "In progress", "Yesterday, 4:15 PM"),
    ("SW-2041", "Overflowing bin", "Grid Road", "Community report · example record", "Received (demo)", "Yesterday, 2:05 PM"),
    ("SW-2026", "Missed collection", "Dandi Road", "Community report · example record", "Resolved", "Nov 05, 11:20 AM"),
]


class ReportInput(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    area: str = Field(min_length=2, max_length=80)
    details: str = Field(min_length=1, max_length=2000)
    location: str | None = Field(default=None, max_length=240)
    status: str = Field(default="Received (demo)", max_length=50)
    date: str = Field(default="Just now", max_length=50)
    image: str | None = Field(default=None, max_length=1_800_000)
    source: str | None = Field(default="Web form", max_length=80)
    voiceNoteName: str | None = Field(default=None, max_length=160)
    voiceNoteData: str | None = Field(default=None, max_length=1_500_000)


class ReportUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=50)
    afterImage: str | None = Field(default=None, max_length=1_800_000)


class FeedbackInput(BaseModel):
    reportId: str = Field(min_length=1, max_length=24)
    rating: int = Field(ge=1, le=5)
    note: str = Field(default="", max_length=2000)


@contextmanager
def connect_db():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db():
    with connect_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY, category TEXT NOT NULL, area TEXT NOT NULL,
            details TEXT NOT NULL, location TEXT, status TEXT NOT NULL, date TEXT NOT NULL,
            image TEXT, after_image TEXT, source TEXT, voice_note_name TEXT,
            voice_note_data TEXT, created_at TEXT NOT NULL
        )""")
        columns = {row["name"] for row in db.execute("PRAGMA table_info(reports)").fetchall()}
        if "voice_note_name" not in columns:
            db.execute("ALTER TABLE reports ADD COLUMN voice_note_name TEXT")
        if "voice_note_data" not in columns:
            db.execute("ALTER TABLE reports ADD COLUMN voice_note_data TEXT")
        if "location" not in columns:
            db.execute("ALTER TABLE reports ADD COLUMN location TEXT")
        db.execute("""CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
        )""")
        db.executemany(
            "INSERT OR IGNORE INTO reports (id, category, area, details, status, date, source, created_at) VALUES (?, ?, ?, ?, ?, ?, 'Sample data', ?)",
            [(*item, f"2026-11-{index + 1:02d}T00:00:00+00:00") for index, item in enumerate(SAMPLE_REPORTS)],
        )


def report_dict(row):
    return {
        "id": row["id"], "category": row["category"], "area": row["area"],
        "details": row["details"], "status": row["status"], "date": row["date"],
        "image": row["image"], "afterImage": row["after_image"], "source": row["source"],
        "voiceNoteName": row["voice_note_name"], "location": row["location"],
    }


init_db()

@app.get("/")
def home():
    return {
        "message": "Welcome to S.W.A.C.H Navsari!",
        "status": "Backend is running successfully"
    }

@app.get("/health")
def health():
    with connect_db() as db:
        db.execute("SELECT 1").fetchone()
    return {"status": "healthy", "storage": "local SQLite demo"}


@app.get("/api/reports")
def list_reports():
    with connect_db() as db:
        rows = db.execute("SELECT * FROM reports ORDER BY created_at DESC").fetchall()
    return [report_dict(row) for row in rows]


@app.post("/api/reports", status_code=201)
def create_report(report: ReportInput):
    with connect_db() as db:
        for _ in range(30):
            report_id = f"SW-{randint(3000, 9999)}"
            exists = db.execute("SELECT 1 FROM reports WHERE id = ?", (report_id,)).fetchone()
            if not exists:
                break
        else:
            raise HTTPException(status_code=503, detail="Could not create a unique demo reference.")

        created_at = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO reports (id, category, area, details, location, status, date, image, source, voice_note_name, voice_note_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (report_id, report.category, report.area, report.details, report.location, "Received (demo)", "Just now", report.image, report.source, report.voiceNoteName, report.voiceNoteData, created_at),
        )
        row = db.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return report_dict(row)


@app.get("/api/reports/{report_id}/voice-note")
def get_voice_note(report_id: str):
    with connect_db() as db:
        row = db.execute("SELECT voice_note_name, voice_note_data FROM reports WHERE id = ?", (report_id,)).fetchone()
    if not row or not row["voice_note_data"]:
        raise HTTPException(status_code=404, detail="Voice note not found.")
    return {"name": row["voice_note_name"], "dataUrl": row["voice_note_data"]}


@app.patch("/api/reports/{report_id}")
def update_report(report_id: str, update: ReportUpdate):
    allowed_statuses = {"Received (demo)", "Crew assigned", "In progress", "Resolved", "Verified (demo)"}
    if update.status not in allowed_statuses:
        raise HTTPException(status_code=422, detail="Choose a supported demo status.")

    with connect_db() as db:
        row = db.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found.")
        after_image = update.afterImage if update.afterImage is not None else row["after_image"]
        if update.status == "Verified (demo)" and not after_image:
            raise HTTPException(status_code=409, detail="Add a completion photo before marking this demo item verified.")
        db.execute("UPDATE reports SET status = ?, after_image = ? WHERE id = ?", (update.status, after_image, report_id))
        updated = db.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return report_dict(updated)


@app.post("/api/feedback", status_code=201)
def create_feedback(feedback: FeedbackInput):
    with connect_db() as db:
        db.execute(
            "INSERT INTO feedback (report_id, rating, note, created_at) VALUES (?, ?, ?, ?)",
            (feedback.reportId, feedback.rating, feedback.note, datetime.now(timezone.utc).isoformat()),
        )
    return {"saved": True, "scope": "local demo only"}


@app.get("/api/feedback")
def list_feedback():
    with connect_db() as db:
        rows = db.execute("SELECT report_id, rating, note, created_at FROM feedback ORDER BY id DESC LIMIT 30").fetchall()
    return [{"reportId": row["report_id"], "rating": row["rating"], "note": row["note"], "createdAt": row["created_at"]} for row in rows]


@app.get("/api/feedback/summary")
def feedback_summary():
    with connect_db() as db:
        result = db.execute("SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average FROM feedback").fetchone()
    return {"count": result["count"], "averageRating": result["average"]}
