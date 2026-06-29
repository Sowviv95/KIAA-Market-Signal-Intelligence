"""KIAA Market Signal Intelligence backend — FastAPI application."""

from __future__ import annotations

import csv
import io
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .llm_service import call_llm, normalize_response
from .models import ParseMarketSignalsRequest, ParseMarketSignalsResponse

# Load .env from backend directory
_backend_dir = Path(__file__).resolve().parent.parent
_repo_root = _backend_dir.parent
load_dotenv(_backend_dir / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KIAA Market Signal Intelligence",
    description="LLM-backed market signal parsing and intelligence service.",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [f"http://localhost:{p}" for p in range(5173, 5184)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Endpoints ─────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "kiaa-market-signal-intelligence-backend",
    }


@app.post("/parse-market-signals", response_model=ParseMarketSignalsResponse)
def parse_market_signals(req: ParseMarketSignalsRequest):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="LLM service is not configured. Set OPENAI_API_KEY in backend environment.",
        )

    raw = call_llm(req)
    if raw is None:
        raise HTTPException(
            status_code=502,
            detail="LLM call failed or returned unparseable output. Check backend logs.",
        )

    try:
        return normalize_response(raw)
    except Exception:
        logger.exception("Response normalization failed")
        raise HTTPException(
            status_code=502,
            detail="LLM response could not be normalized into the expected schema.",
        )


# ── Configured source sync ───────────────────────────────────────────────

SYNC_BASE = _repo_root / "sample_data" / "sync_drop"
ALLOWED_SYNC_EXTENSIONS = {".txt", ".csv", ".json"}
ALLOWED_SYNC_DOMAINS = {"freight", "mining", "agriculture"}
MAX_PREVIEW = 400


def _parse_sync_file(path: Path) -> dict:
    """Read a single file from the sync folder and return its summary."""
    ext = path.suffix.lower()
    size = path.stat().st_size
    entry: dict = {
        "file_name": path.name,
        "file_type": ext.lstrip("."),
        "size_bytes": size,
        "summary": "",
        "headers": [],
        "row_count": 0,
        "json_keys": [],
        "text_preview": "",
    }
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        entry["summary"] = "Could not read file"
        return entry

    if ext == ".csv":
        reader = csv.reader(io.StringIO(raw))
        rows = list(reader)
        if rows:
            entry["headers"] = [h.strip() for h in rows[0]]
            data_rows = rows[1:]
            entry["row_count"] = len(data_rows)
            entry["summary"] = f"CSV with {len(entry['headers'])} columns, {entry['row_count']} rows"
            preview_rows = data_rows[:3]
            entry["text_preview"] = " | ".join(entry["headers"]) + "\n" + "\n".join(
                " | ".join(r) for r in preview_rows
            )
    elif ext == ".json":
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                entry["json_keys"] = list(parsed.keys())[:10]
                entry["summary"] = f"JSON with keys: {', '.join(entry['json_keys'])}"
            elif isinstance(parsed, list):
                entry["summary"] = f"JSON array with {len(parsed)} items"
            entry["text_preview"] = raw[:MAX_PREVIEW]
        except json.JSONDecodeError:
            entry["summary"] = "Invalid JSON"
            entry["text_preview"] = raw[:MAX_PREVIEW]
    else:
        entry["summary"] = f"Text file, {size} bytes"
        entry["text_preview"] = raw[:MAX_PREVIEW]

    return entry


DOMAIN_LABELS = {
    "freight": "Freight / shipping rates",
    "mining": "Mining commodities",
    "agriculture": "Agriculture commodities",
}


@app.get("/sync-sources")
def sync_sources(domain: str = "freight"):
    """Read files from the configured sync drop folder for a specific domain."""
    domain_key = domain.lower().strip()
    if domain_key not in ALLOWED_SYNC_DOMAINS:
        return {
            "source": "configured_sync",
            "domain": domain_key,
            "folder": "",
            "files": [],
            "message": f"No configured sync sources available for '{domain}'",
        }

    sync_folder = SYNC_BASE / domain_key
    sync_folder.mkdir(parents=True, exist_ok=True)

    files = []
    for p in sorted(sync_folder.iterdir()):
        if p.is_file() and p.suffix.lower() in ALLOWED_SYNC_EXTENSIONS:
            files.append(_parse_sync_file(p))

    return {
        "source": "configured_sync",
        "domain": domain_key,
        "folder": str(sync_folder.relative_to(_repo_root)),
        "files": files,
        **({"message": f"No configured sync sources found for {DOMAIN_LABELS.get(domain_key, domain_key)}"} if not files else {}),
    }
