"""KIAA Market Signal Intelligence backend — FastAPI application."""

from __future__ import annotations

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
