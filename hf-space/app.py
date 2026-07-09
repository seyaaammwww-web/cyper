"""
Cyber Cafe Cloud API — Hugging Face Spaces compatible backend.
Mirrors the ManagerApp HTTP API for cloud / remote deployment.
"""
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = os.environ.get("CAFE_DB_PATH", "/data/cyber_cafe.db")
API_TOKEN = os.environ.get("CAFE_API_TOKEN", secrets.token_urlsafe(32))
PORT = int(os.environ.get("PORT", "7860"))

app = FastAPI(title="Cyber Cafe API", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (in-memory)
_hits: dict[str, list[float]] = {}


def rate_limit(key: str, max_req: int = 120, window: int = 60):
    now = time.time()
    bucket = _hits.setdefault(key, [])
    bucket[:] = [t for t in bucket if now - t < window]
    if len(bucket) >= max_req:
        raise HTTPException(429, "Rate limit exceeded")
    bucket.append(now)


@contextmanager
def get_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            cafe_name TEXT DEFAULT 'Cyber Cafe',
            currency TEXT DEFAULT 'EGP',
            server_port INTEGER DEFAULT 8080,
            api_token TEXT NOT NULL,
            offline_grace_seconds INTEGER DEFAULT 300,
            minimum_session_minutes INTEGER DEFAULT 0,
            billing_rounding TEXT DEFAULT 'none',
            tax_percent REAL DEFAULT 0,
            strict_snack_orders INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS pcs (
            id INTEGER PRIMARY KEY, name TEXT, type TEXT,
            hourly_rate REAL, is_online INTEGER DEFAULT 0,
            last_heartbeat INTEGER, current_session_id INTEGER,
            thumbnail TEXT, sort_order INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pc_id INTEGER, start_time INTEGER, end_time INTEGER,
            duration_seconds INTEGER DEFAULT 0, time_cost REAL DEFAULT 0,
            offline_duration INTEGER DEFAULT 0, status TEXT DEFAULT 'active'
        );
        CREATE TABLE IF NOT EXISTS snacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE, price REAL, is_enabled INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS snack_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pc_id INTEGER, session_id INTEGER, snack_name TEXT,
            quantity INTEGER, price REAL, total_price REAL,
            status TEXT DEFAULT 'pending', timestamp INTEGER
        );
        CREATE TABLE IF NOT EXISTS pending_commands (
            pc_id INTEGER PRIMARY KEY, command TEXT, created_at INTEGER
        );
        """)
        row = db.execute("SELECT 1 FROM settings WHERE id=1").fetchone()
        if not row:
            db.execute(
                "INSERT INTO settings (id, api_token) VALUES (1, ?)", (API_TOKEN,)
            )
            # Seed 13 PCs
            for i in range(1, 14):
                t = "VIP" if i <= 6 else "Premium"
                rate = 25.0 if i <= 6 else 20.0
                db.execute(
                    "INSERT OR IGNORE INTO pcs (id,name,type,hourly_rate,sort_order) VALUES (?,?,?,?,?)",
                    (i, f"{t}-{i:02d}", t, rate, i),
                )
            for name, price in [
                ("Cola", 10), ("Chips", 15), ("Coffee", 20), ("Water", 5),
                ("Chocolate", 25), ("Tea", 10), ("Juice", 15), ("Sandwich", 30),
            ]:
                db.execute(
                    "INSERT OR IGNORE INTO snacks (name,price) VALUES (?,?)",
                    (name, price),
                )


def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(403, "Invalid API token")
    if authorization[7:] != API_TOKEN:
        raise HTTPException(403, "Invalid API token")


class RegisterBody(BaseModel):
    pc_id: int
    name: Optional[str] = None


class HeartbeatBody(BaseModel):
    pc_id: int
    session_start: Optional[int] = None
    offline_duration: int = 0
    thumbnail: Optional[str] = None


class OrderBody(BaseModel):
    pc_id: int
    snack: str
    quantity: int = 1
    price: float


class EndSessionBody(BaseModel):
    pc_id: int


def load_token():
    """Keep the API token stable across restarts.

    If CAFE_API_TOKEN is set, it wins and is synced to the database.
    Otherwise reuse the token already stored in the database so a restart
    never invalidates tokens that clients were configured with.
    """
    global API_TOKEN
    env_token = os.environ.get("CAFE_API_TOKEN")
    with get_db() as db:
        row = db.execute("SELECT api_token FROM settings WHERE id=1").fetchone()
        if env_token:
            API_TOKEN = env_token
            if row and row["api_token"] != env_token:
                db.execute(
                    "UPDATE settings SET api_token=? WHERE id=1", (env_token,)
                )
        elif row and row["api_token"]:
            API_TOKEN = row["api_token"]


@app.on_event("startup")
def startup():
    init_db()
    load_token()


@app.get("/health")
def health():
    with get_db() as db:
        pcs = db.execute("SELECT COUNT(*) c FROM pcs").fetchone()["c"]
        online = db.execute(
            "SELECT COUNT(*) c FROM pcs WHERE is_online=1"
        ).fetchone()["c"]
    return {
        "status": "healthy",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pcs_total": pcs,
        "pcs_online": online,
        "platform": "huggingface-spaces",
    }


@app.post("/register")
def register(body: RegisterBody, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    with get_db() as db:
        pc = db.execute("SELECT * FROM pcs WHERE id=?", (body.pc_id,)).fetchone()
        if not pc:
            raise HTTPException(404, "PC not found")
        now = int(time.time())
        db.execute(
            "UPDATE pcs SET is_online=1, last_heartbeat=? WHERE id=?",
            (now, body.pc_id),
        )
        return {
            "status": "registered",
            "pc_id": body.pc_id,
            "name": pc["name"],
            "type": pc["type"],
            "hourly_rate": pc["hourly_rate"],
        }


@app.post("/heartbeat")
def heartbeat(body: HeartbeatBody, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    rate_limit(f"hb_{body.pc_id}")
    with get_db() as db:
        pc = db.execute("SELECT id FROM pcs WHERE id=?", (body.pc_id,)).fetchone()
        if not pc:
            raise HTTPException(404, "PC not found")
        now = int(time.time())
        thumb = body.thumbnail
        if thumb and len(thumb) > 400_000:
            raise HTTPException(413, "Thumbnail too large")
        if thumb:
            db.execute(
                "UPDATE pcs SET is_online=1, last_heartbeat=?, thumbnail=? WHERE id=?",
                (now, thumb, body.pc_id),
            )
        else:
            db.execute(
                "UPDATE pcs SET is_online=1, last_heartbeat=? WHERE id=?",
                (now, body.pc_id),
            )
        if body.session_start:
            db.execute(
                """UPDATE sessions SET start_time=? WHERE pc_id=? AND status='active' AND start_time>?""",
                (body.session_start, body.pc_id, body.session_start),
            )
        return {"status": "acknowledged", "timestamp": now}


@app.get("/command")
def command(pc_id: int, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    with get_db() as db:
        row = db.execute(
            "SELECT command FROM pending_commands WHERE pc_id=?", (pc_id,)
        ).fetchone()
        return {"command": row["command"] if row else "none"}


@app.get("/pcs")
def list_pcs(authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    with get_db() as db:
        rows = db.execute("SELECT * FROM pcs ORDER BY sort_order").fetchall()
        return {"pcs": [dict(r) for r in rows]}


@app.get("/snacks")
def list_snacks(authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM snacks WHERE is_enabled=1 ORDER BY name"
        ).fetchall()
        return {"snacks": [dict(r) for r in rows]}


@app.post("/order")
def order(body: OrderBody, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    rate_limit(f"order_{body.pc_id}", 30)
    with get_db() as db:
        snack = db.execute(
            "SELECT * FROM snacks WHERE LOWER(name)=LOWER(?)", (body.snack,)
        ).fetchone()
        if not snack or not snack["is_enabled"]:
            raise HTTPException(400, "Snack not found or disabled")
        if abs(snack["price"] - body.price) > 0.01:
            raise HTTPException(400, "Price mismatch")
        now = int(time.time())
        sid = db.execute(
            "SELECT id FROM sessions WHERE pc_id=? AND status='active'",
            (body.pc_id,),
        ).fetchone()
        oid = db.execute(
            """INSERT INTO snack_orders (pc_id,session_id,snack_name,quantity,price,total_price,timestamp)
               VALUES (?,?,?,?,?,?,?)""",
            (
                body.pc_id,
                sid["id"] if sid else None,
                body.snack,
                body.quantity,
                snack["price"],
                snack["price"] * body.quantity,
                now,
            ),
        ).lastrowid
        return {
            "status": "ordered",
            "order_id": oid,
            "total_price": snack["price"] * body.quantity,
        }


def _round_up(seconds: int, interval: int) -> int:
    if seconds <= 0:
        return 0
    return ((seconds + interval - 1) // interval) * interval


@app.post("/end_session")
def end_session(body: EndSessionBody, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    with get_db() as db:
        session = db.execute(
            "SELECT * FROM sessions WHERE pc_id=? AND status='active'",
            (body.pc_id,),
        ).fetchone()
        if not session:
            raise HTTPException(404, "No active session")

        pc = db.execute(
            "SELECT * FROM pcs WHERE id=?", (body.pc_id,)
        ).fetchone()
        if not pc:
            raise HTTPException(404, "PC not found")

        settings = db.execute("SELECT * FROM settings WHERE id=1").fetchone()
        grace = settings["offline_grace_seconds"] if settings else 300
        minimum_minutes = settings["minimum_session_minutes"] if settings else 0
        rounding = settings["billing_rounding"] if settings else "none"
        tax_percent = settings["tax_percent"] if settings else 0

        now = int(time.time())
        raw_duration = max(0, now - session["start_time"])
        offline = session["offline_duration"] or 0
        billable = raw_duration + max(0, offline - grace)

        adjusted = billable
        minimum = (minimum_minutes or 0) * 60
        if minimum > 0 and 0 < adjusted < minimum:
            adjusted = minimum
        if rounding == "5min":
            adjusted = _round_up(adjusted, 300)
        elif rounding == "15min":
            adjusted = _round_up(adjusted, 900)

        cost = (adjusted / 3600) * (pc["hourly_rate"] or 0)
        if tax_percent and tax_percent > 0:
            cost *= 1 + tax_percent / 100

        db.execute(
            """UPDATE sessions SET end_time=?, duration_seconds=?, time_cost=?,
               status='completed' WHERE id=?""",
            (now, adjusted, cost, session["id"]),
        )
        db.execute(
            "UPDATE pcs SET current_session_id=NULL WHERE id=?",
            (body.pc_id,),
        )

        snack_row = db.execute(
            """SELECT COALESCE(SUM(total_price), 0) AS total FROM snack_orders
               WHERE session_id=? AND status != 'cancelled'""",
            (session["id"],),
        ).fetchone()
        snack_cost = snack_row["total"] if snack_row else 0

        return {
            "status": "success",
            "message": "Session ended",
            "billing": {
                "time_cost": cost,
                "snack_cost": snack_cost,
                "grand_total": cost + snack_cost,
                "duration_seconds": adjusted,
            },
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
