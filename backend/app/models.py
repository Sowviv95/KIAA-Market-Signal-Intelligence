"""Pydantic request/response models for the KIAA Market Signal Intelligence backend."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ── Request models ────────────────────────────────────────────────────────


class UploadedFileSummary(BaseModel):
    name: str
    extension: Literal["txt", "csv", "json"]
    detected_domain: str | None = None
    source_category: str | None = None
    row_count: int = 0
    column_count: int = 0
    columns: list[str] = Field(default_factory=list)
    preview: str = ""


class CsvSignal(BaseModel):
    fileName: str
    domain: str
    sourceCategory: str
    signal: str
    direction: Literal["Bullish", "Bearish", "Mixed", "Neutral"]
    strength: Literal["Low", "Medium", "High"]
    confidence: int = Field(ge=0, le=100)
    evidence: str
    forecastUse: str


class ParseMarketSignalsRequest(BaseModel):
    selected_domain: Literal["freight", "mining", "agriculture", "custom"] = "freight"
    url: str = ""
    note: str = ""
    uploaded_files: list[UploadedFileSummary] = Field(default_factory=list)
    csv_signals: list[CsvSignal] = Field(default_factory=list)


# ── Response models ───────────────────────────────────────────────────────

Direction = Literal["Bullish", "Bearish", "Mixed", "Neutral"]
Strength = Literal["Low", "Medium", "High"]


class SignalOut(BaseModel):
    label: str
    direction: Direction
    strength: Strength
    confidence: int = Field(ge=0, le=100)
    evidence: str
    forecast_use: str


class TrainingSignal(BaseModel):
    feature: str
    value: str
    direction: Direction
    source: str
    forecast_use: str


class SourceEvidence(BaseModel):
    source: str
    evidence: str


class ChartGuidance(BaseModel):
    bias: str
    signal_change_pct: float
    uncertainty_band_pct: float
    top_driver: str
    event_markers: list[str] = Field(default_factory=list)
    model_mode: str = "LLM-structured source intelligence; no live scraping."


class ParseMarketSignalsResponse(BaseModel):
    detected_domain: str
    source_type: str
    outlook: str
    forecast_pressure: str
    confidence: int = Field(ge=0, le=100)
    confidence_label: str
    horizon: str
    volatility_risk: str
    signals: list[SignalOut] = Field(default_factory=list)
    upward_drivers: list[str] = Field(default_factory=list)
    offsets: list[str] = Field(default_factory=list)
    watchlist: list[str] = Field(default_factory=list)
    reasoning: str
    training_signals: list[TrainingSignal] = Field(default_factory=list)
    source_evidence: list[SourceEvidence] = Field(default_factory=list)
    chart_guidance: ChartGuidance
