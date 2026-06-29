"""LLM provider wrapper and response normalization for KIAA backend."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from .models import (
    ChartGuidance,
    ParseMarketSignalsRequest,
    ParseMarketSignalsResponse,
    SignalOut,
    SourceEvidence,
    TrainingSignal,
)

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a market intelligence analyst for the KIAA Market Signal Intelligence platform.

Your task: given a selected domain, an optional URL string, an optional pasted market note, \
uploaded file summaries, and deterministic CSV-derived signals, produce a single structured \
JSON intelligence report.

IMPORTANT RULES:
- You have NOT fetched any URL. You are interpreting the URL text only.
- You have NOT scraped any website. Do not claim you did.
- Use only the supplied note text, URL string, uploaded file summaries, and CSV signals as evidence.
- Do not hallucinate exact market values, prices, or percentages not provided in the input.
- Be concise and analyst-style. Write like a commodity desk analyst.
- Detect the domain from source context. If selected_domain conflicts with URL/files, \
  note the mismatch but use the most relevant domain.
- For Drewry or World Container Index URLs, treat as freight/container benchmark context.
- For bunker/fuel CSV signals with evidence of easing (negative change), treat as cost offset.
- For a freight upload pack with congestion + rate + fuel signals, combine into a mildly \
  bullish 2-4 week outlook with bunker fuel as a partial offset.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema (no markdown, no explanation outside JSON):

{
  "detected_domain": "freight|mining|agriculture|custom",
  "source_type": "short description of primary source type",
  "outlook": "Bullish|Mildly bullish|Mixed|Bearish|Neutral",
  "forecast_pressure": "same as outlook or similar short label",
  "confidence": <integer 0-100>,
  "confidence_label": "Low|Moderate|Medium-high|High",
  "horizon": "time horizon string e.g. 2-4 weeks",
  "volatility_risk": "Low|Medium|Medium-high|High",
  "signals": [
    {
      "label": "signal name",
      "direction": "Bullish|Bearish|Mixed|Neutral",
      "strength": "Low|Medium|High",
      "confidence": <integer 0-100>,
      "evidence": "one-sentence evidence",
      "forecast_use": "how this signal is used in forecast"
    }
  ],
  "upward_drivers": ["driver1", "driver2"],
  "offsets": ["offset1"],
  "watchlist": ["item1", "item2"],
  "reasoning": "Concise analyst-style reasoning paragraph (2-4 sentences).",
  "training_signals": [
    {
      "feature": "snake_case_feature_key",
      "value": "0.74",
      "direction": "Bullish|Bearish|Mixed|Neutral",
      "source": "URL|Note|CSV",
      "forecast_use": "short description"
    }
  ],
  "source_evidence": [
    {
      "source": "URL|Note|CSV",
      "evidence": "the actual evidence text"
    }
  ],
  "chart_guidance": {
    "bias": "same as outlook",
    "signal_change_pct": <float, estimated signal change>,
    "uncertainty_band_pct": <float, estimated uncertainty>,
    "top_driver": "name of top driver",
    "event_markers": ["short event label 1", "short event label 2"],
    "model_mode": "LLM-structured source intelligence; no live scraping."
  }
}

Rules for field values:
- confidence: integer 0-100
- direction: exactly one of Bullish, Bearish, Mixed, Neutral
- strength: exactly one of Low, Medium, High
- feature keys in training_signals: use snake_case, max 30 chars
- Keep signals array to 3-8 items
- Keep training_signals to 3-8 items
- Keep event_markers to 2-4 items
- reasoning should be 2-4 sentences, analyst style
"""


# ── Provider wrapper ──────────────────────────────────────────────────────


def _get_openai_client():
    """Return an OpenAI client or None if not configured."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        logger.exception("Failed to create OpenAI client")
        return None


def _build_user_message(req: ParseMarketSignalsRequest) -> str:
    """Build the user message from the request payload."""
    parts: list[str] = []
    parts.append(f"Selected domain: {req.selected_domain}")

    if req.url:
        parts.append(f"URL (text only, not fetched): {req.url}")
    if req.note:
        parts.append(f"Pasted market note:\n{req.note}")

    if req.uploaded_files:
        parts.append("Uploaded file summaries:")
        for f in req.uploaded_files:
            cols = ", ".join(f.columns[:10]) if f.columns else "none"
            parts.append(
                f"  - {f.name} (.{f.extension})"
                f" | domain={f.detected_domain or 'unknown'}"
                f" | category={f.source_category or 'unknown'}"
                f" | rows={f.row_count}, cols={f.column_count}"
                f" | columns: {cols}"
                f" | preview: {f.preview[:200]}"
            )

    if req.csv_signals:
        parts.append("CSV-derived signals (deterministic frontend extraction):")
        for s in req.csv_signals:
            parts.append(
                f"  - {s.signal}"
                f" | direction={s.direction}, strength={s.strength}"
                f" | confidence={s.confidence}%"
                f" | file={s.fileName}"
                f" | evidence: {s.evidence}"
                f" | forecast use: {s.forecastUse}"
            )

    if not req.url and not req.note and not req.uploaded_files and not req.csv_signals:
        parts.append("No source input provided. Return a neutral/awaiting-data response.")

    return "\n".join(parts)


def call_llm(req: ParseMarketSignalsRequest) -> dict[str, Any] | None:
    """Call the LLM and return the raw parsed JSON dict, or None on failure."""
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider != "openai":
        logger.warning("Unsupported LLM provider: %s, falling back to openai", provider)

    client = _get_openai_client()
    if client is None:
        return None

    user_msg = _build_user_message(req)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        content = response.choices[0].message.content or ""
        return _extract_json(content)
    except Exception:
        logger.exception("LLM call failed")
        return None


# ── JSON extraction & repair ──────────────────────────────────────────────


def _extract_json(text: str) -> dict[str, Any] | None:
    """Extract JSON from LLM response, handling markdown fences and minor issues."""
    # Strip markdown code fences
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse JSON from LLM response")
    return None


# ── Response normalization ────────────────────────────────────────────────

VALID_DIRECTIONS = {"Bullish", "Bearish", "Mixed", "Neutral"}
VALID_STRENGTHS = {"Low", "Medium", "High"}


def _clamp(v: Any, lo: int, hi: int, default: int) -> int:
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def _norm_direction(v: Any) -> str:
    s = str(v).strip().title()
    return s if s in VALID_DIRECTIONS else "Mixed"


def _norm_strength(v: Any) -> str:
    s = str(v).strip().title()
    return s if s in VALID_STRENGTHS else "Medium"


def _ensure_list(v: Any) -> list:
    if isinstance(v, list):
        return v
    return []


def _norm_signal(raw: Any) -> SignalOut | None:
    if not isinstance(raw, dict):
        return None
    return SignalOut(
        label=str(raw.get("label", "Unknown signal")),
        direction=_norm_direction(raw.get("direction")),
        strength=_norm_strength(raw.get("strength")),
        confidence=_clamp(raw.get("confidence"), 0, 100, 60),
        evidence=str(raw.get("evidence", "")),
        forecast_use=str(raw.get("forecast_use", "")),
    )


def _norm_training_signal(raw: Any) -> TrainingSignal | None:
    if not isinstance(raw, dict):
        return None
    return TrainingSignal(
        feature=str(raw.get("feature", "unknown"))[:30],
        value=str(raw.get("value", "0.50")),
        direction=_norm_direction(raw.get("direction")),
        source=str(raw.get("source", "Unknown")),
        forecast_use=str(raw.get("forecast_use", "")),
    )


def _norm_source_evidence(raw: Any) -> SourceEvidence | None:
    if not isinstance(raw, dict):
        return None
    return SourceEvidence(
        source=str(raw.get("source", "Unknown")),
        evidence=str(raw.get("evidence", "")),
    )


def _norm_chart_guidance(raw: Any) -> ChartGuidance:
    if not isinstance(raw, dict):
        return ChartGuidance(
            bias="Mixed",
            signal_change_pct=0.0,
            uncertainty_band_pct=8.0,
            top_driver="Unknown",
        )
    return ChartGuidance(
        bias=str(raw.get("bias", "Mixed")),
        signal_change_pct=float(raw.get("signal_change_pct", 0.0)),
        uncertainty_band_pct=float(raw.get("uncertainty_band_pct", 8.0)),
        top_driver=str(raw.get("top_driver", "Unknown")),
        event_markers=[str(e) for e in _ensure_list(raw.get("event_markers"))],
        model_mode=str(raw.get("model_mode", "LLM-structured source intelligence; no live scraping.")),
    )


def normalize_response(raw: dict[str, Any]) -> ParseMarketSignalsResponse:
    """Normalize a raw LLM JSON dict into a validated response model."""
    signals = [s for s in (_norm_signal(r) for r in _ensure_list(raw.get("signals"))) if s]
    training = [t for t in (_norm_training_signal(r) for r in _ensure_list(raw.get("training_signals"))) if t]
    evidence = [e for e in (_norm_source_evidence(r) for r in _ensure_list(raw.get("source_evidence"))) if e]

    conf = _clamp(raw.get("confidence"), 0, 100, 65)
    conf_label = str(raw.get("confidence_label", ""))
    if not conf_label:
        conf_label = "High" if conf >= 80 else "Medium-high" if conf >= 70 else "Moderate" if conf >= 55 else "Low"

    return ParseMarketSignalsResponse(
        detected_domain=str(raw.get("detected_domain", "custom")),
        source_type=str(raw.get("source_type", "Market source")),
        outlook=str(raw.get("outlook", "Mixed")),
        forecast_pressure=str(raw.get("forecast_pressure", raw.get("outlook", "Mixed"))),
        confidence=conf,
        confidence_label=conf_label,
        horizon=str(raw.get("horizon", "2-4 weeks")),
        volatility_risk=str(raw.get("volatility_risk", "Medium")),
        signals=signals,
        upward_drivers=[str(d) for d in _ensure_list(raw.get("upward_drivers"))],
        offsets=[str(d) for d in _ensure_list(raw.get("offsets"))],
        watchlist=[str(d) for d in _ensure_list(raw.get("watchlist"))],
        reasoning=str(raw.get("reasoning", "No reasoning provided.")),
        training_signals=training,
        source_evidence=evidence,
        chart_guidance=_norm_chart_guidance(raw.get("chart_guidance")),
    )
