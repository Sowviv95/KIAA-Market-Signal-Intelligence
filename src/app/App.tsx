import React, { useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceDot, ReferenceArea, Label,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = "intake" | "intelligence" | "forecast";
type DomainId = "mining" | "freight" | "agriculture" | "custom";

interface Signal {
  name: string;
  direction: string;
  directionColor: string;
  strength: number;
  confidence: string;
}

interface ParsedSource {
  name: string;
  type: string;
  status: string;
  quality: string;
}

type FileExtension = "txt" | "csv" | "json" | "unsupported";

interface UploadedSource {
  id: string;
  name: string;
  extension: FileExtension;
  status: "parsed" | "warning" | "error";
  detectedDomain?: string;
  sourceCategory?: string;
  rowCount?: number;
  columnCount?: number;
  columns?: string[];
  parsedRows?: Record<string, string>[];
  preview: string;
  message?: string;
}

type UploadedFileSignal = {
  fileName: string;
  domain: DomainId | "unknown";
  sourceCategory: string;
  signal: string;
  direction: "Bullish" | "Bearish" | "Mixed" | "Neutral";
  strength: "Low" | "Medium" | "High";
  confidence: number;
  evidence: string;
  forecastUse: string;
};

// ── LLM backend types & client ────────────────────────────────────────────

interface LLMSignalOut {
  label: string;
  direction: string;
  strength: string;
  confidence: number;
  evidence: string;
  forecast_use: string;
}

interface LLMTrainingSignal {
  feature: string;
  value: string;
  direction: string;
  source: string;
  forecast_use: string;
}

interface LLMSourceEvidence {
  source: string;
  evidence: string;
}

interface LLMChartGuidance {
  bias: string;
  signal_change_pct: number;
  uncertainty_band_pct: number;
  top_driver: string;
  event_markers: string[];
  model_mode: string;
}

interface LLMResponse {
  detected_domain: string;
  source_type: string;
  outlook: string;
  forecast_pressure: string;
  confidence: number;
  confidence_label: string;
  horizon: string;
  volatility_risk: string;
  signals: LLMSignalOut[];
  upward_drivers: string[];
  offsets: string[];
  watchlist: string[];
  reasoning: string;
  training_signals: LLMTrainingSignal[];
  source_evidence: LLMSourceEvidence[];
  chart_guidance: LLMChartGuidance;
}

type GenerateStatus = "idle" | "analysing" | "done" | "error";

const BACKEND_URL = "http://127.0.0.1:8001";

async function callLLMMarketSignals(
  selectedDomain: DomainId,
  url: string,
  note: string,
  uploadedFiles: UploadedSource[],
  csvSignals: UploadedFileSignal[],
): Promise<LLMResponse> {
  const payload = {
    selected_domain: selectedDomain,
    url,
    note,
    uploaded_files: uploadedFiles
      .filter((f) => f.status === "parsed")
      .map((f) => ({
        name: f.name,
        extension: f.extension,
        detected_domain: f.detectedDomain || null,
        source_category: f.sourceCategory || null,
        row_count: f.rowCount || 0,
        column_count: f.columnCount || 0,
        columns: f.columns || [],
        preview: f.preview.slice(0, 300),
      })),
    csv_signals: csvSignals.map((s) => ({
      fileName: s.fileName,
      domain: s.domain,
      sourceCategory: s.sourceCategory,
      signal: s.signal,
      direction: s.direction,
      strength: s.strength,
      confidence: s.confidence,
      evidence: s.evidence,
      forecastUse: s.forecastUse,
    })),
  };
  const res = await fetch(`${BACKEND_URL}/parse-market-signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Backend error ${res.status}`);
  }
  return res.json();
}

// ── Configured source sync client ─────────────────────────────────────────

interface SyncFileEntry {
  file_name: string;
  file_type: string;
  size_bytes: number;
  summary: string;
  headers: string[];
  row_count: number;
  json_keys: string[];
  text_preview: string;
}

interface SyncResponse {
  source: string;
  domain?: string;
  folder: string;
  files: SyncFileEntry[];
  message?: string;
}

async function fetchSyncSources(domain: DomainId): Promise<SyncResponse> {
  const res = await fetch(`${BACKEND_URL}/sync-sources?domain=${encodeURIComponent(domain)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Sync error ${res.status}`);
  }
  return res.json();
}

function syncFilesToUploadedSources(files: SyncFileEntry[]): UploadedSource[] {
  return files.map((f) => {
    const ext = f.file_type === "csv" ? "csv" : f.file_type === "json" ? "json" : f.file_type === "txt" ? "txt" : "unsupported" as FileExtension;
    return {
      id: `sync-${f.file_name}-${Date.now()}`,
      name: f.file_name,
      extension: ext,
      status: "parsed" as const,
      detectedDomain: detectDomainFromName(f.file_name),
      sourceCategory: "Configured sync",
      rowCount: f.row_count || undefined,
      columnCount: f.headers.length || undefined,
      columns: f.headers.length > 0 ? f.headers : undefined,
      preview: f.text_preview.slice(0, 300),
      message: f.summary,
    };
  });
}

type PreviewSource = { name: string; type: string; status: string; quality: string; subtitle?: string };

function buildSourcePreview(
  url: string,
  note: string,
  uploadedFiles: UploadedSource[],
): PreviewSource[] {
  const rows: PreviewSource[] = [];

  // Separate manual uploads from configured sync files
  const parsedFiles = uploadedFiles.filter((f) => f.status === "parsed");
  const manualFiles = parsedFiles.filter((f) => f.sourceCategory !== "Configured sync");
  const syncFiles = parsedFiles.filter((f) => f.sourceCategory === "Configured sync");

  if (url) {
    const ul = url.toLowerCase();
    const label = ul.includes("drewry") || ul.includes("container-index") ? "Drewry World Container Index URL"
      : ul.includes("baltic") || ul.includes("bdi") ? "Baltic index URL"
      : ul.includes("freight") || ul.includes("shipping") ? "Freight intelligence URL"
      : ul.includes("mine") || ul.includes("metal") || ul.includes("copper") ? "Mining intelligence URL"
      : ul.includes("crop") || ul.includes("usda") || ul.includes("agri") ? "Agriculture intelligence URL"
      : "Market source URL";
    rows.push({ name: label, type: "URL source", status: "Parsed", quality: "High" });
  }

  // Only show "Pasted market note" if note exists AND was not auto-populated from an uploaded TXT file
  const hasTxtUpload = manualFiles.some((f) => f.extension === "txt");
  if (note && !hasTxtUpload) {
    rows.push({ name: "Pasted market note", type: "Unstructured note", status: "Parsed", quality: note.length > 50 ? "High" : "Medium" });
  }

  // Show each manual uploaded file individually
  for (const uf of manualFiles) {
    const typeLabel = uf.extension === "csv" ? "CSV source"
      : uf.extension === "json" ? "JSON source"
      : "Text source";
    rows.push({ name: uf.name, type: typeLabel, status: "Parsed", quality: uf.extension === "csv" ? "High" : "Medium" });
  }

  // Show configured sync as one aggregated row
  if (syncFiles.length > 0) {
    const domains = syncFiles.map((f) => f.detectedDomain).filter(Boolean);
    const domLabel = domains.length > 0 ? domains[0] : "market";
    rows.push({
      name: `Configured ${domLabel} market sync`,
      type: "Configured sync",
      status: "Ready",
      quality: "High",
      subtitle: `${syncFiles.length} synced source${syncFiles.length !== 1 ? "s" : ""} from scraper output folder`,
    });
  }

  return rows;
}

// ── Domain mismatch detection ──────────────────────────────────────────────

const DOMAIN_HINT_KEYWORDS: Record<string, string[]> = {
  freight: ["freight", "shipping", "container", "drewry", "world container index", "bunker", "port", "vessel", "route", "congestion", "bdi", "baltic"],
  mining: ["mining", "copper", "iron ore", "coal", "nickel", "lithium", "mine", "ore", "smelter", "concentrate", "metal"],
  agriculture: ["agriculture", "wheat", "corn", "soybean", "crop", "yield", "weather", "rainfall", "drought", "harvest", "fertilizer"],
};

function detectSourceDomainHint(url: string, note: string, uploadedFiles: UploadedSource[]): DomainId | null {
  const text = [
    url,
    note.slice(0, 500),
    ...uploadedFiles.filter((f) => f.status === "parsed").map((f) => f.name + " " + (f.preview || "").slice(0, 200)),
  ].join(" ").toLowerCase();

  const scores: Record<string, number> = { freight: 0, mining: 0, agriculture: 0 };
  for (const [dom, kws] of Object.entries(DOMAIN_HINT_KEYWORDS)) {
    for (const kw of kws) {
      if (text.includes(kw)) scores[dom]++;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return null;
  if (sorted[0][1] === sorted[1][1]) return null; // tie — ambiguous
  return sorted[0][0] as DomainId;
}

// ── Domain data ────────────────────────────────────────────────────────────

const DOMAINS: Record<DomainId, {
  label: string;
  urlPlaceholder: string;
  notePlaceholder: string;
  parsedSources: ParsedSource[];
  signals: Signal[];
  drivers: { name: string; contribution: number }[];
  reasoning: { headline: string; body: string };
  brief: {
    market: string;
    outlook: string;
    confidence: string;
    outlookText: string;
    risks: string[];
    features: { name: string; value: number; direction: string; directionColor: string; source: string }[];
    evidence: string[];
  };
}> = {
  mining: {
    label: "Mining commodities",
    urlPlaceholder: "Paste commodity report, mine output bulletin or supply disruption URL",
    notePlaceholder: "Port delays and lower mine output reported this week. Inventory levels remain below the 30-day average.",
    parsedSources: [
      { name: "Market bulletin URL", type: "Unstructured", status: "Parsed", quality: "High" },
      { name: "Inventory levels.csv", type: "Structured", status: "Clean", quality: "High" },
      { name: "Demand proxy.xlsx", type: "Structured", status: "3 gaps fixed", quality: "Medium" },
      { name: "Freight pressure.csv", type: "Structured", status: "Parsed", quality: "High" },
      { name: "Policy note.txt", type: "Text", status: "Parsed", quality: "Medium" },
    ],
    signals: [
      { name: "Supply disruption", direction: "Bullish", directionColor: "#16a34a", strength: 84, confidence: "84%" },
      { name: "Inventory pressure", direction: "Bullish", directionColor: "#16a34a", strength: 88, confidence: "88%" },
      { name: "Demand pressure", direction: "Bullish", directionColor: "#16a34a", strength: 76, confidence: "76%" },
      { name: "Logistics pressure", direction: "Bullish", directionColor: "#16a34a", strength: 72, confidence: "72%" },
      { name: "FX offset", direction: "Bearish", directionColor: "#dc2626", strength: 35, confidence: "65%" },
      { name: "Policy / event risk", direction: "Watch", directionColor: "#d97706", strength: 45, confidence: "69%" },
    ],
    drivers: [
      { name: "Supply disruption", contribution: 32 },
      { name: "Inventory tightness", contribution: 27 },
      { name: "Demand recovery", contribution: 18 },
      { name: "FX offset", contribution: -9 },
    ],
    reasoning: {
      headline: "Moderately bullish price pressure",
      body: "The latest market view is driven by supply disruption signals, tight inventory and rising demand pressure. FX movement partially offsets the signal, but not enough to move the outlook neutral.",
    },
    brief: {
      market: "Mining commodities",
      outlook: "Bullish",
      confidence: "81%",
      outlookText: "Price pressure is moderately bullish over the next 2–4 weeks. Supply disruption, low inventory and stronger demand signals are directionally aligned. FX pressure remains the main offset.",
      risks: [
        "Supply disruption persists beyond current window",
        "Inventory restocking is slower than expected",
        "Freight pressure strengthens across key routes",
      ],
      features: [
        { name: "supply_disruption", value: 0.86, direction: "Bullish", directionColor: "#16a34a", source: "URL" },
        { name: "inventory_pressure", value: 0.79, direction: "Bullish", directionColor: "#16a34a", source: "CSV" },
        { name: "demand_pressure", value: 0.62, direction: "Bullish", directionColor: "#16a34a", source: "XLS" },
        { name: "logistics_pressure", value: 0.55, direction: "Bullish", directionColor: "#16a34a", source: "CSV" },
        { name: "fx_offset", value: 0.34, direction: "Bearish", directionColor: "#dc2626", source: "API" },
      ],
      evidence: [
        "Market bulletin: disruption note parsed",
        "Inventory file: below rolling average",
        "Demand proxy: positive momentum",
      ],
    },
  },
  freight: {
    label: "Freight / shipping rates",
    urlPlaceholder: "Paste freight index, shipping rate bulletin or port congestion update URL",
    notePlaceholder: "Baltic Dry Index softened this week. Port congestion on key Asia-Pacific routes continues to delay vessel turnaround.",
    parsedSources: [
      { name: "BDI rate bulletin URL", type: "Unstructured", status: "Parsed", quality: "High" },
      { name: "Port congestion.csv", type: "Structured", status: "Clean", quality: "High" },
      { name: "Route demand.xlsx", type: "Structured", status: "2 gaps fixed", quality: "Medium" },
      { name: "Fuel cost index.csv", type: "Structured", status: "Parsed", quality: "High" },
    ],
    signals: [
      { name: "Route demand", direction: "Bullish", directionColor: "#16a34a", strength: 79, confidence: "79%" },
      { name: "Port congestion", direction: "Bullish", directionColor: "#16a34a", strength: 82, confidence: "82%" },
      { name: "Fuel cost pressure", direction: "Bearish", directionColor: "#dc2626", strength: 40, confidence: "70%" },
      { name: "Vessel availability", direction: "Bullish", directionColor: "#16a34a", strength: 68, confidence: "68%" },
      { name: "FX offset", direction: "Watch", directionColor: "#d97706", strength: 42, confidence: "62%" },
      { name: "Regulatory risk", direction: "Watch", directionColor: "#d97706", strength: 38, confidence: "60%" },
    ],
    drivers: [
      { name: "Port congestion", contribution: 30 },
      { name: "Route demand growth", contribution: 24 },
      { name: "Vessel shortage", contribution: 20 },
      { name: "Fuel headwinds", contribution: -12 },
    ],
    reasoning: {
      headline: "Moderately bullish rate pressure",
      body: "Port congestion and rising route demand point to bullish rate pressure. Fuel cost headwinds partially offset upward pressure. Overall direction remains bullish with elevated volatility.",
    },
    brief: {
      market: "Freight / shipping rates",
      outlook: "Bullish",
      confidence: "76%",
      outlookText: "Rate pressure is moderately bullish over the next 1–3 weeks. Port congestion and rising route demand are the key drivers. Fuel cost headwinds provide a partial offset.",
      risks: [
        "Port congestion spreads to additional routes",
        "Fuel cost increase accelerates unexpectedly",
        "New vessel capacity enters key lanes early",
      ],
      features: [
        { name: "route_demand", value: 0.79, direction: "Bullish", directionColor: "#16a34a", source: "API" },
        { name: "port_congestion", value: 0.82, direction: "Bullish", directionColor: "#16a34a", source: "URL" },
        { name: "fuel_cost_pressure", value: 0.40, direction: "Bearish", directionColor: "#dc2626", source: "CSV" },
        { name: "vessel_availability", value: 0.68, direction: "Bullish", directionColor: "#16a34a", source: "CSV" },
        { name: "fx_offset", value: 0.42, direction: "Watch", directionColor: "#d97706", source: "API" },
      ],
      evidence: [
        "BDI rate bulletin: upward momentum confirmed",
        "Port congestion file: key Asia-Pacific routes",
        "Vessel utilisation: above seasonal average",
      ],
    },
  },
  agriculture: {
    label: "Agriculture commodities",
    urlPlaceholder: "Paste crop report, weather bulletin, harvest forecast or USDA update URL",
    notePlaceholder: "Wheat harvest estimates revised down due to dry conditions. Corn futures remain volatile amid export demand signals.",
    parsedSources: [
      { name: "USDA crop report URL", type: "Unstructured", status: "Parsed", quality: "High" },
      { name: "Harvest volume.csv", type: "Structured", status: "Clean", quality: "High" },
      { name: "Weather index.xlsx", type: "Structured", status: "1 gap fixed", quality: "Medium" },
      { name: "Export demand.csv", type: "Structured", status: "Parsed", quality: "High" },
      { name: "Trade policy note.txt", type: "Text", status: "Parsed", quality: "Medium" },
    ],
    signals: [
      { name: "Harvest volume", direction: "Bearish", directionColor: "#dc2626", strength: 75, confidence: "75%" },
      { name: "Export demand", direction: "Bullish", directionColor: "#16a34a", strength: 80, confidence: "80%" },
      { name: "Weather risk", direction: "Watch", directionColor: "#d97706", strength: 55, confidence: "65%" },
      { name: "Input cost pressure", direction: "Bearish", directionColor: "#dc2626", strength: 48, confidence: "68%" },
      { name: "Policy / trade risk", direction: "Watch", directionColor: "#d97706", strength: 44, confidence: "63%" },
      { name: "FX offset", direction: "Bearish", directionColor: "#dc2626", strength: 35, confidence: "60%" },
    ],
    drivers: [
      { name: "Export demand", contribution: 28 },
      { name: "Harvest shortfall", contribution: 22 },
      { name: "Trade tariff risk", contribution: 14 },
      { name: "FX headwind", contribution: -10 },
    ],
    reasoning: {
      headline: "Mixed outlook with upward skew",
      body: "Strong export demand supports prices despite harvest shortfall risk. Weather uncertainty and trade policy risk add volatility. Net signal skews bullish but confidence is moderate.",
    },
    brief: {
      market: "Agriculture commodities",
      outlook: "Mixed / Bullish",
      confidence: "68%",
      outlookText: "Price outlook is mixed with an upward skew over the next 3–6 weeks. Strong export demand offsets harvest shortfall risk. Weather and trade policy uncertainty keep confidence moderate.",
      risks: [
        "Weather event materially lowers harvest estimates",
        "Trade tariff escalation disrupts export flows",
        "FX headwinds intensify beyond current forecast",
      ],
      features: [
        { name: "export_demand", value: 0.80, direction: "Bullish", directionColor: "#16a34a", source: "API" },
        { name: "harvest_volume", value: 0.75, direction: "Bearish", directionColor: "#dc2626", source: "XLS" },
        { name: "weather_risk", value: 0.55, direction: "Watch", directionColor: "#d97706", source: "URL" },
        { name: "input_cost_pressure", value: 0.48, direction: "Bearish", directionColor: "#dc2626", source: "CSV" },
        { name: "fx_offset", value: 0.35, direction: "Bearish", directionColor: "#dc2626", source: "API" },
      ],
      evidence: [
        "USDA crop report: harvest revised down",
        "Export demand proxy: positive trend confirmed",
        "Weather index: dry conditions elevated risk",
      ],
    },
  },
  custom: {
    label: "Custom market",
    urlPlaceholder: "Paste any market report, data feed or intelligence URL",
    notePlaceholder: "Add notes about your custom market domain. Describe sources, key drivers and expected signal types.",
    parsedSources: [
      { name: "Awaiting configuration", type: "—", status: "Pending", quality: "—" },
    ],
    signals: [
      { name: "Primary signal", direction: "Neutral", directionColor: "#6b7280", strength: 50, confidence: "50%" },
      { name: "Secondary signal", direction: "Neutral", directionColor: "#6b7280", strength: 45, confidence: "45%" },
      { name: "Market sentiment", direction: "Watch", directionColor: "#d97706", strength: 40, confidence: "40%" },
    ],
    drivers: [
      { name: "Awaiting signal input", contribution: 0 },
    ],
    reasoning: {
      headline: "Awaiting source configuration",
      body: "Add market sources and notes to generate domain-specific signals. The system will parse inputs and produce a signal-adjusted forecast once data is provided.",
    },
    brief: {
      market: "Custom market",
      outlook: "Neutral",
      confidence: "—",
      outlookText: "Custom domain selected. Add source data and market notes to generate a forecast. Demo mode will produce placeholder signals until real sources are configured.",
      risks: [
        "No source data configured yet",
        "Signal quality depends on input completeness",
      ],
      features: [
        { name: "primary_signal", value: 0.50, direction: "Neutral", directionColor: "#6b7280", source: "—" },
        { name: "secondary_signal", value: 0.45, direction: "Neutral", directionColor: "#6b7280", source: "—" },
      ],
      evidence: [
        "No sources parsed — awaiting configuration",
      ],
    },
  },
};

// ── Tokens ─────────────────────────────────────────────────────────────────

const C = {
  bg: "#f0f4f8",
  card: "#ffffff",
  inputBg: "#f8fafc",
  green: "#16a34a",
  greenSubtle: "rgba(22,163,74,0.08)",
  greenBorder: "rgba(22,163,74,0.22)",
  text: "#0f172a",
  textSec: "#374151",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  border: "rgba(0,0,0,0.08)",
  borderSub: "rgba(0,0,0,0.06)",
  borderInput: "rgba(0,0,0,0.10)",
  red: "#dc2626",
  amber: "#d97706",
};

const card: React.CSSProperties = {
  background: C.card,
  borderRadius: "12px",
  border: `1px solid ${C.border}`,
  padding: "26px",
};

// ── Timeline generator ────────────────────────────────────────────────────
// Generates relative weekly labels anchored to the forecast start (transition point).
// Historical points are labelled T-Nw (weeks before now).
// The transition point is labelled "Now".
// Forecast points are labelled T+Nw (weeks into the forecast horizon).
// This avoids fake calendar labels — the demo shows relative forecast distance.

function generateTimeline(historicalWeeks: number, forecastWeeks: number): string[] {
  const labels: string[] = [];
  // Historical: T-7w … T-1w (the last historical point before transition)
  for (let i = 0; i < historicalWeeks - 1; i++) {
    const weeksBack = historicalWeeks - 1 - i;
    labels.push(`T-${weeksBack}w`);
  }
  // Transition point (last actual = first forecast anchor)
  labels.push("Now");
  // Forecast: T+1w … T+Nw
  for (let j = 1; j <= forecastWeeks; j++) {
    labels.push(`T+${j}w`);
  }
  return labels;
}

// Each domain: 7 historical + 1 transition + 8 forecast = 16 rows
const TIMELINE = generateTimeline(8, 8);

type ChartPhase = "historical" | "signal_window" | "forecast";

// ── Per-domain chart & Screen 2 metrics ──────────────────────────────────

interface DomainChartConfig {
  summaryMetrics: { label: string; value: string; color: string }[];
  chartData: Array<{ period: string; actual?: number; forecast?: number; lower?: number; bandWidth?: number; phase: ChartPhase }>;
  events: { period: string; value: number; label: string; direction: "up" | "down" | "neutral" }[];
  metrics: { label: string; value: string; color: string }[];
}

function buildChartData(
  actuals: number[],
  forecasts: number[],
  lowers: number[],
  bandWidths: number[],
  signalWindowStart: number, // index into actuals where signal window begins
): DomainChartConfig["chartData"] {
  const rows: DomainChartConfig["chartData"] = [];
  // Historical actuals
  for (let i = 0; i < actuals.length; i++) {
    const phase: ChartPhase = i >= signalWindowStart ? "signal_window" : "historical";
    if (i === actuals.length - 1) {
      // Transition point — last actual is also first forecast
      rows.push({ period: TIMELINE[i], actual: actuals[i], forecast: actuals[i], lower: actuals[i], bandWidth: 0, phase });
    } else {
      rows.push({ period: TIMELINE[i], actual: actuals[i], phase });
    }
  }
  // Forecast points
  for (let j = 0; j < forecasts.length; j++) {
    rows.push({
      period: TIMELINE[actuals.length + j],
      forecast: forecasts[j],
      lower: lowers[j],
      bandWidth: bandWidths[j],
      phase: "forecast",
    });
  }
  return rows;
}

const DOMAIN_CHARTS: Record<DomainId, DomainChartConfig> = {
  mining: {
    summaryMetrics: [
      { label: "Forecast pressure", value: "Bullish", color: C.green },
      { label: "Confidence", value: "81%", color: C.text },
      { label: "Volatility risk", value: "Elevated", color: C.amber },
      { label: "Horizon", value: "2\u20134 weeks", color: C.text },
    ],
    chartData: buildChartData(
      [100.0, 101.2, 99.8, 102.5, 104.1, 103.2, 105.8, 108.4],
      [110.2, 111.8, 113.5, 114.2, 115.8, 116.4, 117.9, 118.5],
      [106.4, 107.4, 108.2, 108.4, 109.1, 108.8, 109.6, 109.2],
      [7.6, 8.8, 10.6, 11.6, 13.4, 15.2, 16.6, 18.6],
      5, // signal window starts at T-2w (index 5)
    ),
    events: [
      { period: TIMELINE[2], value: 99.8, label: "Supply disruption", direction: "up" as const },
      { period: TIMELINE[5], value: 103.2, label: "Inventory tightness", direction: "up" as const },
    ],
    metrics: [
      { label: "Forecast bias", value: "Bullish", color: C.green },
      { label: "30-day signal change", value: "+4.8%", color: C.green },
      { label: "Confidence", value: "78%", color: C.text },
      { label: "Uncertainty band", value: "\u00B16.2%", color: C.amber },
      { label: "Top driver", value: "Supply disruption", color: C.text },
      { label: "Model mode", value: "Signal-adjusted", color: C.textMuted },
    ],
  },
  freight: {
    summaryMetrics: [
      { label: "Forecast pressure", value: "Firming", color: C.green },
      { label: "Confidence", value: "74%", color: C.text },
      { label: "Volatility risk", value: "High", color: C.red },
      { label: "Horizon", value: "1\u20133 weeks", color: C.text },
    ],
    chartData: buildChartData(
      [100.0, 98.5, 101.8, 99.2, 103.5, 101.0, 104.2, 106.8],
      [108.0, 109.5, 110.8, 111.2, 112.5, 113.0, 114.2, 114.8],
      [103.5, 103.8, 103.0, 102.5, 102.0, 101.2, 101.0, 100.5],
      [9.0, 11.4, 15.6, 17.4, 21.0, 23.6, 26.4, 28.6],
      4, // signal window starts at T-3w
    ),
    events: [
      { period: TIMELINE[1], value: 98.5, label: "Port congestion", direction: "up" as const },
      { period: TIMELINE[6], value: 104.2, label: "Bunker fuel spike", direction: "down" as const },
    ],
    metrics: [
      { label: "Forecast bias", value: "Firming", color: C.green },
      { label: "30-day signal change", value: "+3.2%", color: C.green },
      { label: "Confidence", value: "74%", color: C.text },
      { label: "Uncertainty band", value: "\u00B19.4%", color: C.red },
      { label: "Top driver", value: "Port congestion", color: C.text },
      { label: "Model mode", value: "Signal-adjusted", color: C.textMuted },
    ],
  },
  agriculture: {
    summaryMetrics: [
      { label: "Forecast pressure", value: "Mixed / Bullish", color: C.amber },
      { label: "Confidence", value: "71%", color: C.text },
      { label: "Volatility risk", value: "Moderate", color: C.amber },
      { label: "Horizon", value: "3\u20136 weeks", color: C.text },
    ],
    chartData: buildChartData(
      [100.0, 100.8, 99.5, 98.2, 99.0, 101.5, 103.0, 104.5],
      [106.0, 107.2, 108.0, 109.5, 110.8, 111.5, 112.0, 112.8],
      [102.8, 103.5, 103.0, 103.2, 103.0, 102.5, 102.0, 101.5],
      [6.4, 7.4, 10.0, 12.6, 15.6, 18.0, 20.0, 22.6],
      4,
    ),
    events: [
      { period: TIMELINE[2], value: 99.5, label: "Crop weather alert", direction: "down" as const },
      { period: TIMELINE[5], value: 101.5, label: "Export demand signal", direction: "up" as const },
    ],
    metrics: [
      { label: "Forecast bias", value: "Mixed / Bullish", color: C.amber },
      { label: "30-day signal change", value: "+2.1%", color: C.green },
      { label: "Confidence", value: "71%", color: C.text },
      { label: "Uncertainty band", value: "\u00B17.8%", color: C.amber },
      { label: "Top driver", value: "Export demand", color: C.text },
      { label: "Model mode", value: "Signal-adjusted", color: C.textMuted },
    ],
  },
  custom: {
    summaryMetrics: [
      { label: "Forecast pressure", value: "Neutral", color: C.textMuted },
      { label: "Confidence", value: "\u2014", color: C.textMuted },
      { label: "Volatility risk", value: "Unknown", color: C.textMuted },
      { label: "Horizon", value: "\u2014", color: C.textMuted },
    ],
    chartData: buildChartData(
      [100.0, 100.2, 99.8, 100.1, 100.3, 99.9, 100.4, 100.5],
      [100.8, 101.0, 101.2, 101.5, 101.8, 102.0, 102.2, 102.5],
      [98.0, 97.5, 97.0, 96.5, 96.0, 95.5, 95.0, 94.5],
      [5.6, 7.0, 8.4, 10.0, 11.6, 13.0, 14.4, 16.0],
      6,
    ),
    events: [],
    metrics: [
      { label: "Forecast bias", value: "Neutral", color: C.textMuted },
      { label: "30-day signal change", value: "\u2014", color: C.textMuted },
      { label: "Confidence", value: "\u2014", color: C.textMuted },
      { label: "Uncertainty band", value: "\u2014", color: C.textMuted },
      { label: "Top driver", value: "Awaiting data", color: C.textMuted },
      { label: "Model mode", value: "Unconfigured", color: C.textMuted },
    ],
  },
};

function ForecastChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value?: number; color?: string; payload?: ChartRow }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const phase = row?.phase === "forecast" ? "Forecast" : row?.phase === "signal_window" ? "Signal window" : "Historical";
  const phaseColor = row?.phase === "forecast" ? C.green : row?.phase === "signal_window" ? C.amber : C.textMuted;
  const actualVal = payload.find(p => p.dataKey === "actual")?.value;
  const baselineVal = payload.find(p => p.dataKey === "baseline")?.value;
  const forecastVal = payload.find(p => p.dataKey === "forecast")?.value;
  const lowerVal = row?.lower;
  const upperVal = lowerVal !== undefined && row?.bandWidth !== undefined ? +(lowerVal + row.bandWidth).toFixed(1) : undefined;
  const delta = baselineVal !== undefined && forecastVal !== undefined && baselineVal !== forecastVal
    ? +(forecastVal - baselineVal).toFixed(1) : null;

  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: "8px",
      padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      fontSize: "12px", lineHeight: 1.7, minWidth: 170,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <p style={{ margin: 0, fontWeight: 600, color: C.text }}>{label}</p>
        <span style={{ fontSize: "9px", fontWeight: 600, color: phaseColor, textTransform: "uppercase" }}>{phase}</span>
      </div>
      {actualVal !== undefined && <p style={{ margin: 0, color: C.text }}>Actual: <strong>{actualVal.toFixed(1)}</strong></p>}
      {baselineVal !== undefined && row?.phase === "forecast" && <p style={{ margin: 0, color: "#94a3b8" }}>Baseline: <strong>{baselineVal.toFixed(1)}</strong></p>}
      {forecastVal !== undefined && row?.phase === "forecast" && <p style={{ margin: 0, color: C.green }}>Signal-adjusted: <strong>{forecastVal.toFixed(1)}</strong></p>}
      {upperVal !== undefined && lowerVal !== undefined && row?.phase === "forecast" && (
        <p style={{ margin: 0, color: C.textFaint }}>Range: {lowerVal.toFixed(1)} – {upperVal.toFixed(1)}</p>
      )}
      {delta !== null && <p style={{ margin: 0, color: delta > 0 ? C.green : C.red, fontWeight: 500 }}>vs baseline: {delta > 0 ? "+" : ""}{delta.toFixed(1)}</p>}
    </div>
  );
}

// ── Deterministic parser ──────────────────────────────────────────────────

interface ParsedSignal {
  label: string;
  direction: string;
  directionColor: string;
  strength: number;
  confidence: number;
  evidence: string;
}

interface ParsedResult {
  sourceType: string;
  extractedSignals: ParsedSignal[];
  parsedEntities: string[];
  forecastImpact: string;
  confidence: number;
  statusSteps: string[];
  reasoning: string;
  urlSource: string | null;
  noteSnippet: string | null;
}

const DIR_COLOR: Record<string, string> = { Bullish: "#16a34a", Bearish: "#dc2626", Watch: "#d97706" };

const DOMAIN_KEYWORDS: Record<DomainId, { keyword: string; signal: string; direction: string; strength: number; confidence: number }[]> = {
  mining: [
    { keyword: "supply disruption", signal: "Supply disruption", direction: "Bullish", strength: 84, confidence: 82 },
    { keyword: "mine outage", signal: "Mine output disruption", direction: "Bullish", strength: 80, confidence: 78 },
    { keyword: "smelter", signal: "Smelter demand pressure", direction: "Bullish", strength: 72, confidence: 74 },
    { keyword: "inventory", signal: "Inventory drawdown", direction: "Bullish", strength: 78, confidence: 80 },
    { keyword: "copper", signal: "Copper market signal", direction: "Bullish", strength: 70, confidence: 72 },
    { keyword: "lithium", signal: "Lithium market signal", direction: "Bullish", strength: 68, confidence: 70 },
    { keyword: "nickel", signal: "Nickel market signal", direction: "Bullish", strength: 66, confidence: 68 },
    { keyword: "shipment delay", signal: "Logistics disruption", direction: "Bullish", strength: 74, confidence: 76 },
    { keyword: "export restriction", signal: "Trade restriction risk", direction: "Watch", strength: 60, confidence: 65 },
  ],
  freight: [
    { keyword: "port congestion", signal: "Port congestion pressure", direction: "Bullish", strength: 82, confidence: 80 },
    { keyword: "vessel", signal: "Vessel tightness", direction: "Bullish", strength: 78, confidence: 76 },
    { keyword: "bunker fuel", signal: "Bunker fuel cost pressure", direction: "Bullish", strength: 74, confidence: 72 },
    { keyword: "route rate", signal: "Route rate signal", direction: "Bullish", strength: 76, confidence: 74 },
    { keyword: "spot rate", signal: "Spot rate upward signal", direction: "Bullish", strength: 80, confidence: 78 },
    { keyword: "container", signal: "Container scarcity", direction: "Bullish", strength: 72, confidence: 70 },
    { keyword: "blank sailing", signal: "Blank sailings pressure", direction: "Bullish", strength: 70, confidence: 68 },
    { keyword: "transit delay", signal: "Transit delay impact", direction: "Bullish", strength: 68, confidence: 66 },
  ],
  agriculture: [
    { keyword: "adverse weather", signal: "Weather risk pressure", direction: "Bullish", strength: 76, confidence: 72 },
    { keyword: "rainfall deficit", signal: "Rainfall deficit signal", direction: "Bullish", strength: 78, confidence: 74 },
    { keyword: "drought", signal: "Drought risk elevated", direction: "Bullish", strength: 80, confidence: 76 },
    { keyword: "crop condition", signal: "Crop condition stress", direction: "Bullish", strength: 74, confidence: 72 },
    { keyword: "export inspection", signal: "Export demand confirmed", direction: "Bullish", strength: 72, confidence: 78 },
    { keyword: "planting progress", signal: "Planting progress signal", direction: "Watch", strength: 60, confidence: 65 },
    { keyword: "stock-to-use", signal: "Stock-to-use tightening", direction: "Bullish", strength: 76, confidence: 74 },
    { keyword: "yield risk", signal: "Yield risk elevated", direction: "Bullish", strength: 74, confidence: 70 },
  ],
  custom: [
    { keyword: "shortage", signal: "Shortage signal", direction: "Bullish", strength: 70, confidence: 65 },
    { keyword: "demand increase", signal: "Demand pressure", direction: "Bullish", strength: 68, confidence: 63 },
    { keyword: "supply delay", signal: "Supply delay impact", direction: "Bullish", strength: 66, confidence: 62 },
    { keyword: "price rise", signal: "Price upward pressure", direction: "Bullish", strength: 64, confidence: 60 },
    { keyword: "inventory change", signal: "Inventory signal", direction: "Watch", strength: 58, confidence: 58 },
    { keyword: "volatility", signal: "Volatility signal", direction: "Watch", strength: 55, confidence: 55 },
  ],
};

// URL-specific keyword rules: terms found in URL path/host → signals
const URL_KEYWORDS: Record<DomainId, { term: string; signal: string; direction: string; strength: number; confidence: number; entity: string }[]> = {
  freight: [
    { term: "drewry", signal: "Container freight index source indicates rate benchmark pressure", direction: "Mixed", strength: 68, confidence: 72, entity: "Drewry" },
    { term: "world-container-index", signal: "World Container Index benchmark tracked", direction: "Mixed", strength: 70, confidence: 74, entity: "World Container Index" },
    { term: "container-index", signal: "Container freight index tracked", direction: "Mixed", strength: 68, confidence: 70, entity: "container freight index" },
    { term: "container", signal: "Container freight signal", direction: "Bullish", strength: 72, confidence: 70, entity: "container freight" },
    { term: "supply-chain", signal: "Supply chain pressure signal", direction: "Bullish", strength: 70, confidence: 68, entity: "supply chain" },
    { term: "shipping", signal: "Shipping rate intelligence source", direction: "Bullish", strength: 74, confidence: 72, entity: "shipping rates" },
    { term: "freight", signal: "Freight rate intelligence source", direction: "Bullish", strength: 76, confidence: 74, entity: "freight rates" },
    { term: "rate", signal: "Rate benchmark signal", direction: "Mixed", strength: 66, confidence: 68, entity: "rate benchmark" },
    { term: "route", signal: "Route rate signal", direction: "Bullish", strength: 72, confidence: 70, entity: "route rates" },
    { term: "index", signal: "Market index signal", direction: "Mixed", strength: 64, confidence: 66, entity: "market index" },
    { term: "congestion", signal: "Port congestion intelligence", direction: "Bullish", strength: 80, confidence: 78, entity: "port congestion" },
    { term: "bunker", signal: "Bunker fuel intelligence", direction: "Bearish", strength: 68, confidence: 66, entity: "bunker fuel" },
    { term: "baltic", signal: "Baltic index intelligence", direction: "Bullish", strength: 76, confidence: 74, entity: "Baltic index" },
    { term: "bdi", signal: "BDI rate intelligence", direction: "Bullish", strength: 76, confidence: 74, entity: "BDI" },
  ],
  mining: [
    { term: "copper", signal: "Copper market intelligence source", direction: "Bullish", strength: 72, confidence: 70, entity: "copper market" },
    { term: "lithium", signal: "Lithium market intelligence source", direction: "Bullish", strength: 70, confidence: 68, entity: "lithium market" },
    { term: "nickel", signal: "Nickel market intelligence source", direction: "Bullish", strength: 68, confidence: 66, entity: "nickel market" },
    { term: "metal", signal: "Metals market intelligence source", direction: "Bullish", strength: 70, confidence: 70, entity: "metals market" },
    { term: "mine", signal: "Mining production intelligence", direction: "Bullish", strength: 74, confidence: 72, entity: "mining production" },
    { term: "inventory", signal: "Inventory intelligence source", direction: "Bullish", strength: 76, confidence: 74, entity: "inventory data" },
    { term: "commodity", signal: "Commodity index intelligence", direction: "Bullish", strength: 68, confidence: 66, entity: "commodity index" },
  ],
  agriculture: [
    { term: "crop", signal: "Crop report intelligence source", direction: "Bullish", strength: 74, confidence: 72, entity: "crop report" },
    { term: "usda", signal: "USDA report intelligence", direction: "Bullish", strength: 78, confidence: 76, entity: "USDA report" },
    { term: "weather", signal: "Weather risk intelligence", direction: "Bullish", strength: 72, confidence: 70, entity: "weather risk" },
    { term: "grain", signal: "Grain market intelligence", direction: "Bullish", strength: 70, confidence: 68, entity: "grain market" },
    { term: "agri", signal: "Agriculture intelligence source", direction: "Bullish", strength: 68, confidence: 66, entity: "agriculture" },
    { term: "export", signal: "Export demand intelligence", direction: "Bullish", strength: 72, confidence: 70, entity: "export demand" },
    { term: "drought", signal: "Drought risk intelligence", direction: "Bullish", strength: 76, confidence: 74, entity: "drought risk" },
  ],
  custom: [
    { term: "market", signal: "Market intelligence source", direction: "Watch", strength: 58, confidence: 58, entity: "market data" },
    { term: "index", signal: "Index benchmark source", direction: "Watch", strength: 56, confidence: 56, entity: "index benchmark" },
    { term: "data", signal: "Data source detected", direction: "Watch", strength: 54, confidence: 54, entity: "data source" },
  ],
};

function parseMarketInput(domain: DomainId, url: string, note: string): ParsedResult {
  const text = (url + " " + note).toLowerCase();
  const keywords = DOMAIN_KEYWORDS[domain];
  const matched = keywords.filter((k) => text.includes(k.keyword));

  // URL-specific keyword extraction: parse URL path/host for domain terms
  const urlMatched: typeof URL_KEYWORDS["freight"] = [];
  if (url) {
    const urlLower = url.toLowerCase();
    const urlTerms = URL_KEYWORDS[domain] || [];
    const seen = new Set<string>();
    for (const ut of urlTerms) {
      if (urlLower.includes(ut.term) && !seen.has(ut.signal)) {
        seen.add(ut.signal);
        urlMatched.push(ut);
      }
    }
  }

  // Infer source type
  let sourceType = "Market note";
  if (url) {
    const u = url.toLowerCase();
    // More specific source types from URL content
    if (u.includes("drewry") || u.includes("container-index") || u.includes("world-container-index")) sourceType = "Container freight index / route rate benchmark";
    else if (u.includes("baltic") || u.includes("bdi")) sourceType = "Baltic index intelligence URL";
    else if (u.includes("port") || u.includes("shipping") || u.includes("freight") || u.includes("bunker") || u.includes("container") || u.includes("supply-chain")) sourceType = "Freight intelligence URL";
    else if (u.includes("mine") || u.includes("metal") || u.includes("copper") || u.includes("lithium") || u.includes("inventory")) sourceType = "Mining intelligence URL";
    else if (u.includes("crop") || u.includes("weather") || u.includes("agri") || u.includes("grain") || u.includes("export") || u.includes("usda")) sourceType = "Agriculture intelligence URL";
    else sourceType = "External source URL";
  } else if (note) {
    sourceType = domain === "mining" ? "Analyst market note" : domain === "freight" ? "Route intelligence note" : domain === "agriculture" ? "Crop market note" : "Custom market note";
  }

  // Combine note-keyword matches + URL-keyword matches, dedup by signal label
  const allSignals: ParsedSignal[] = [];
  const allEntities: string[] = [];
  const seenLabels = new Set<string>();

  for (const m of matched) {
    if (!seenLabels.has(m.signal)) {
      seenLabels.add(m.signal);
      allSignals.push({
        label: m.signal,
        direction: m.direction,
        directionColor: DIR_COLOR[m.direction] || "#6b7280",
        strength: m.strength,
        confidence: m.confidence,
        evidence: `Keyword "${m.keyword}" detected in ${note ? "pasted note" : "URL text"}`,
      });
      allEntities.push(m.keyword);
    }
  }
  for (const ut of urlMatched) {
    if (!seenLabels.has(ut.signal)) {
      seenLabels.add(ut.signal);
      allSignals.push({
        label: ut.signal,
        direction: ut.direction,
        directionColor: DIR_COLOR[ut.direction] || "#6b7280",
        strength: ut.strength,
        confidence: ut.confidence,
        evidence: `URL term "${ut.term}" interpreted in demo mode`,
      });
      allEntities.push(ut.entity);
    }
  }

  const hasMatches = allSignals.length > 0;
  const signals: ParsedSignal[] = hasMatches
    ? allSignals
    : [{ label: "General market signal", direction: "Watch", directionColor: "#d97706", strength: 50, confidence: 55, evidence: "No specific keywords matched \u2014 generic signal applied" }];

  const entities = hasMatches ? allEntities : ["general market"];
  const avgConf = Math.round(signals.reduce((a, s) => a + s.confidence, 0) / signals.length);
  const bullishCount = signals.filter((s) => s.direction === "Bullish").length;
  const mixedCount = signals.filter((s) => s.direction === "Mixed").length;
  const forecastImpact = bullishCount > signals.length / 2 ? "Upward pressure"
    : bullishCount === 0 && mixedCount === 0 ? "Neutral"
    : "Mixed with upward skew";

  const entityList = entities.join(", ");
  const dirWord = forecastImpact === "Upward pressure" ? "upside risk" : forecastImpact === "Neutral" ? "neutral impact" : "mixed directional impact";
  const domLabel = DOMAINS[domain].label.toLowerCase();
  const confWord = avgConf >= 75 ? "moderate-high" : avgConf >= 60 ? "moderate" : "low";
  const sourceWord = url && note ? "URL and note" : url ? "URL" : "note";
  const reasoning = `The parsed ${sourceWord} indicates ${entityList}, creating near-term ${dirWord} to ${domLabel}. Confidence is ${confWord} because ${signals.length} independent directional indicator${signals.length !== 1 ? "s" : ""} ${signals.length !== 1 ? "point" : "points"} in ${bullishCount > signals.length / 2 ? "the same direction" : "mixed directions"}${avgConf >= 70 ? ", but the uncertainty band remains manageable." : ", and the uncertainty band remains wide."}`;

  const statusSteps = [
    "Source accepted",
    ...(url ? ["URL interpreted in demo mode"] : []),
    `${entities.length} market entities detected`,
    "Directional signals extracted",
    "Forecast-ready features prepared",
    "Decision pack refreshed",
  ];

  return {
    sourceType,
    extractedSignals: signals,
    parsedEntities: entities,
    forecastImpact,
    confidence: avgConf,
    statusSteps,
    reasoning,
    urlSource: url || null,
    noteSnippet: note ? (note.length > 120 ? note.slice(0, 117) + "..." : note) : null,
  };
}

// ── File upload helpers ────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS: FileExtension[] = ["txt", "csv", "json"];

function getFileExtension(name: string): FileExtension {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "txt") return "txt";
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  return "unsupported";
}

const DOMAIN_FILE_HINTS: Record<string, string> = {
  freight: "freight|shipping|port|fuel|bunker|rate|vessel|congestion|route|bdi|baltic",
  mining: "mining|copper|lithium|nickel|inventory|mine|metal|smelter|production|shipment",
  agriculture: "agriculture|agri|crop|weather|grain|export|stock|rainfall|yield|harvest|drought",
};

function detectDomainFromName(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [domain, pattern] of Object.entries(DOMAIN_FILE_HINTS)) {
    if (new RegExp(pattern).test(lower)) return domain;
  }
  return undefined;
}

function detectDomainFromColumns(cols: string[]): string | undefined {
  const joined = cols.join(" ").toLowerCase();
  for (const [domain, pattern] of Object.entries(DOMAIN_FILE_HINTS)) {
    if (new RegExp(pattern).test(joined)) return domain;
  }
  return undefined;
}

function detectSourceCategory(ext: FileExtension, content: string): string {
  if (ext === "csv") return "Structured data source";
  if (ext === "json") return "Source metadata / notes";
  const lower = content.toLowerCase().slice(0, 500);
  if (lower.includes("analyst") || lower.includes("recommendation") || lower.includes("outlook")) return "Analyst note";
  if (lower.includes("source") || lower.includes("reference") || lower.includes("origin")) return "Source note";
  return "Market note";
}

function parseCsvSimple(text: string): { headers: string[]; rows: string[][]; rowCount: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows, rowCount: rows.length };
}

let _fileIdCounter = 0;

async function parseUploadedFile(file: File): Promise<UploadedSource> {
  const ext = getFileExtension(file.name);
  const id = `upload-${file.name}-${Date.now()}-${++_fileIdCounter}`;

  if (ext === "unsupported") {
    return {
      id, name: file.name, extension: ext, status: "warning",
      preview: "", message: `Unsupported file type. Accepted formats: .txt, .csv, .json`,
    };
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return {
      id, name: file.name, extension: ext, status: "error",
      preview: "", message: "Failed to read file",
    };
  }

  const detectedDomain = detectDomainFromName(file.name);

  if (ext === "txt") {
    const snippet = content.trim().slice(0, 300);
    const category = detectSourceCategory(ext, content);
    return {
      id, name: file.name, extension: ext, status: "parsed",
      detectedDomain, sourceCategory: category,
      preview: snippet + (content.length > 300 ? "..." : ""),
      message: "Local demo file parsed in browser",
    };
  }

  if (ext === "csv") {
    const { headers, rows, rowCount } = parseCsvSimple(content);
    if (headers.length === 0) {
      return {
        id, name: file.name, extension: ext, status: "warning",
        preview: "", message: "CSV file appears empty",
      };
    }
    const domain = detectedDomain || detectDomainFromColumns(headers);
    const previewRows = rows.slice(0, 3).map((r) => r.join(" | ")).join("\n");
    const parsedRows = rows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] || ""; });
      return obj;
    });
    return {
      id, name: file.name, extension: ext, status: "parsed",
      detectedDomain: domain, sourceCategory: "Structured data source",
      rowCount, columnCount: headers.length, columns: headers, parsedRows,
      preview: headers.join(" | ") + "\n" + previewRows,
      message: `CSV headers detected. ${rowCount} rows, ${headers.length} columns`,
    };
  }

  // JSON
  try {
    const parsed = JSON.parse(content);
    const topKeys = Object.keys(parsed).slice(0, 10);
    let preview = `Top-level keys: ${topKeys.join(", ")}`;
    let extra = "";
    if (Array.isArray(parsed.sources)) {
      const names = parsed.sources.slice(0, 5).map((s: Record<string, unknown>) => s.name || s.title || "(unnamed)");
      extra = `\n${parsed.sources.length} sources: ${names.join(", ")}`;
    }
    return {
      id, name: file.name, extension: ext, status: "parsed",
      detectedDomain, sourceCategory: detectSourceCategory(ext, content),
      preview: preview + extra,
      message: "JSON parsed successfully",
    };
  } catch {
    return {
      id, name: file.name, extension: ext, status: "warning",
      preview: content.slice(0, 200),
      message: "Invalid JSON — could not parse",
    };
  }
}

// ── CSV signal extraction ──────────────────────────────────────────────────

function headersMatch(columns: string[], keywords: string[]): boolean {
  const joined = columns.join(" ").toLowerCase();
  return keywords.some((kw) => joined.includes(kw));
}

function nameMatch(fileName: string, keywords: string[]): boolean {
  const lower = fileName.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function extractLastRowValue(rows: Record<string, string>[], colKeywords: string[]): string | undefined {
  if (!rows.length) return undefined;
  const lastRows = rows.slice(-3);
  for (const kw of colKeywords) {
    for (const row of [...lastRows].reverse()) {
      for (const [col, val] of Object.entries(row)) {
        if (col.toLowerCase().includes(kw) && val.trim()) return val.trim();
      }
    }
  }
  return undefined;
}

function extractSignalsFromUploadedFiles(
  uploadedFiles: UploadedSource[],
  selectedDomain: DomainId,
): UploadedFileSignal[] {
  const signals: UploadedFileSignal[] = [];
  const csvFiles = uploadedFiles.filter((f) => f.extension === "csv" && f.status === "parsed" && f.columns);

  for (const file of csvFiles) {
    const cols = file.columns || [];
    const rows = file.parsedRows || [];
    const domain = (file.detectedDomain as DomainId) || selectedDomain;
    const fn = file.name.toLowerCase();

    // ── Freight rules ──
    if (domain === "freight" || selectedDomain === "freight") {
      // Port congestion
      if (nameMatch(fn, ["congestion"]) || headersMatch(cols, ["congestion", "waiting", "queue", "delay"])) {
        const congVal = extractLastRowValue(rows, ["congestion", "waiting", "queue", "delay"]);
        const region = extractLastRowValue(rows, ["port", "region"]);
        const evidenceParts: string[] = [];
        if (region) evidenceParts.push(`Region: ${region}`);
        if (congVal) evidenceParts.push(`Latest congestion/waiting value: ${congVal}`);
        if (!evidenceParts.length) evidenceParts.push(`${rows.length} rows of port congestion data`);
        signals.push({
          fileName: file.name,
          domain: "freight",
          sourceCategory: "Structured data source",
          signal: "Asia-Pacific port congestion remains elevated",
          direction: "Bullish",
          strength: rows.length > 5 ? "High" : "Medium",
          confidence: rows.length > 5 ? 82 : 78,
          evidence: evidenceParts.join("; "),
          forecastUse: "Route-rate upward pressure / capacity absorption",
        });
        continue;
      }

      // Fuel costs — MUST be checked before rate/index to avoid misclassification
      if (nameMatch(fn, ["fuel", "bunker", "vlsfo", "cost_pressure", "offset_signal"]) || headersMatch(cols, ["fuel", "bunker", "vlsfo", "spread", "cost_pressure", "offset_signal"])) {
        const priceVal = extractLastRowValue(rows, ["price", "cost"]);
        const hubVal = extractLastRowValue(rows, ["hub"]);
        const changeVal = extractLastRowValue(rows, ["change", "delta"]);
        const evidenceParts: string[] = [];
        if (hubVal) evidenceParts.push(`Hub: ${hubVal}`);
        if (priceVal) evidenceParts.push(`Latest fuel cost: $${priceVal}`);
        if (changeVal) evidenceParts.push(`Change: ${changeVal}%`);
        if (!evidenceParts.length) evidenceParts.push(`${rows.length} rows of fuel cost data`);
        const isEasing = changeVal && parseFloat(changeVal) < 0;
        signals.push({
          fileName: file.name,
          domain: "freight",
          sourceCategory: "Structured data source",
          signal: "Bunker fuel easing provides a partial cost-pressure offset",
          direction: isEasing ? "Bearish" : "Mixed",
          strength: "Medium",
          confidence: 72,
          evidence: evidenceParts.join("; "),
          forecastUse: "Cost-pressure offset",
        });
        continue;
      }

      // Rate index
      if (nameMatch(fn, ["rate"]) || headersMatch(cols, ["rate", "index"])) {
        const rateVal = extractLastRowValue(rows, ["rate", "index"]);
        const yoyVal = extractLastRowValue(rows, ["yoy"]);
        const wowVal = extractLastRowValue(rows, ["wow"]);
        const evidenceParts: string[] = [];
        if (rateVal) evidenceParts.push(`Latest rate/index: ${rateVal}`);
        if (yoyVal) evidenceParts.push(`YoY: ${yoyVal}`);
        if (wowVal) evidenceParts.push(`WoW: ${wowVal}`);
        if (!evidenceParts.length) evidenceParts.push(`${rows.length} rows of freight rate data`);
        const hasYoYPositive = yoyVal && parseFloat(yoyVal) > 0;
        const hasWoWNeg = wowVal && parseFloat(wowVal) < 0;
        const dir: "Mixed" | "Bullish" = (hasYoYPositive && hasWoWNeg) ? "Mixed" : "Bullish";
        signals.push({
          fileName: file.name,
          domain: "freight",
          sourceCategory: "Structured data source",
          signal: "Freight rate pressure is mixed but still elevated versus prior period",
          direction: dir,
          strength: "Medium",
          confidence: dir === "Mixed" ? 74 : 78,
          evidence: evidenceParts.join("; "),
          forecastUse: "Near-term rate direction feature",
        });
        continue;
      }
    }

    // ── Mining rules ──
    if (domain === "mining" || selectedDomain === "mining") {
      if (headersMatch(cols, ["inventory", "stock"]) || nameMatch(fn, ["inventory", "stock"])) {
        const val = extractLastRowValue(rows, ["inventory", "stock", "level"]);
        signals.push({
          fileName: file.name, domain: "mining", sourceCategory: "Structured data source",
          signal: "Inventory drawdown supports upward price pressure",
          direction: "Bullish", strength: "Medium", confidence: 76,
          evidence: val ? `Latest inventory/stock value: ${val}` : `${rows.length} rows of inventory data`,
          forecastUse: "Supply-tightness feature",
        });
        continue;
      }
      if (headersMatch(cols, ["production", "mine", "output"]) || nameMatch(fn, ["production", "mine"])) {
        const val = extractLastRowValue(rows, ["production", "output"]);
        signals.push({
          fileName: file.name, domain: "mining", sourceCategory: "Structured data source",
          signal: "Production disruption increases supply risk",
          direction: "Bullish", strength: "High", confidence: 78,
          evidence: val ? `Latest production value: ${val}` : `${rows.length} rows of production data`,
          forecastUse: "Supply-disruption feature",
        });
        continue;
      }
      if (headersMatch(cols, ["shipment", "logistics"]) || nameMatch(fn, ["shipment"])) {
        const val = extractLastRowValue(rows, ["shipment", "volume"]);
        signals.push({
          fileName: file.name, domain: "mining", sourceCategory: "Structured data source",
          signal: "Shipment delays tighten nearby availability",
          direction: "Bullish", strength: "Medium", confidence: 74,
          evidence: val ? `Latest shipment value: ${val}` : `${rows.length} rows of shipment data`,
          forecastUse: "Logistics-pressure feature",
        });
        continue;
      }
      if (headersMatch(cols, ["smelter", "demand"]) || nameMatch(fn, ["smelter"])) {
        const val = extractLastRowValue(rows, ["smelter", "demand"]);
        signals.push({
          fileName: file.name, domain: "mining", sourceCategory: "Structured data source",
          signal: "Smelter demand supports consumption signal",
          direction: "Bullish", strength: "Medium", confidence: 72,
          evidence: val ? `Latest smelter/demand value: ${val}` : `${rows.length} rows of smelter data`,
          forecastUse: "Demand-pressure feature",
        });
        continue;
      }
      if (headersMatch(cols, ["copper", "lithium", "nickel", "commodity"]) || nameMatch(fn, ["copper", "lithium", "nickel", "commodity"])) {
        const val = extractLastRowValue(rows, ["price", "value", "index"]);
        signals.push({
          fileName: file.name, domain: "mining", sourceCategory: "Structured data source",
          signal: "Commodity price signal detected",
          direction: "Bullish", strength: "Medium", confidence: 70,
          evidence: val ? `Latest price/value: ${val}` : `${rows.length} rows of commodity data`,
          forecastUse: "Price-direction feature",
        });
        continue;
      }
    }

    // ── Agriculture rules ──
    if (domain === "agriculture" || selectedDomain === "agriculture") {
      if (headersMatch(cols, ["weather", "rainfall", "drought"]) || nameMatch(fn, ["weather", "rainfall", "drought"])) {
        const val = extractLastRowValue(rows, ["rainfall", "weather", "drought", "index"]);
        signals.push({
          fileName: file.name, domain: "agriculture", sourceCategory: "Structured data source",
          signal: "Weather stress raises yield risk",
          direction: "Bullish", strength: "Medium", confidence: 74,
          evidence: val ? `Latest weather/rainfall value: ${val}` : `${rows.length} rows of weather data`,
          forecastUse: "Yield-risk feature",
        });
        continue;
      }
      if (headersMatch(cols, ["export", "inspection"]) || nameMatch(fn, ["export"])) {
        const val = extractLastRowValue(rows, ["export", "volume", "inspection"]);
        signals.push({
          fileName: file.name, domain: "agriculture", sourceCategory: "Structured data source",
          signal: "Export inspections support demand",
          direction: "Bullish", strength: "Medium", confidence: 76,
          evidence: val ? `Latest export value: ${val}` : `${rows.length} rows of export data`,
          forecastUse: "Demand-confirmation feature",
        });
        continue;
      }
      if (headersMatch(cols, ["stock_to_use", "stock"]) || nameMatch(fn, ["stock"])) {
        const val = extractLastRowValue(rows, ["stock", "ratio", "use"]);
        signals.push({
          fileName: file.name, domain: "agriculture", sourceCategory: "Structured data source",
          signal: "Stock-to-use tightening supports upward pressure",
          direction: "Bullish", strength: "High", confidence: 78,
          evidence: val ? `Latest stock/ratio value: ${val}` : `${rows.length} rows of stock data`,
          forecastUse: "Supply-tightness feature",
        });
        continue;
      }
      if (headersMatch(cols, ["crop", "yield", "planting"]) || nameMatch(fn, ["crop", "yield", "planting"])) {
        const val = extractLastRowValue(rows, ["yield", "planting", "progress"]);
        signals.push({
          fileName: file.name, domain: "agriculture", sourceCategory: "Structured data source",
          signal: "Planting progress changes seasonal risk",
          direction: "Mixed", strength: "Medium", confidence: 70,
          evidence: val ? `Latest yield/planting value: ${val}` : `${rows.length} rows of crop data`,
          forecastUse: "Seasonal-risk feature",
        });
        continue;
      }
    }

    // ── Generic fallback for unmatched CSV files ──
    if (cols.length > 0) {
      signals.push({
        fileName: file.name,
        domain: (domain as DomainId) || "unknown",
        sourceCategory: "Structured data source",
        signal: `Structured data detected (${cols.length} columns, ${rows.length} rows)`,
        direction: "Neutral",
        strength: "Low",
        confidence: 55,
        evidence: `Columns: ${cols.slice(0, 5).join(", ")}`,
        forecastUse: "Generic structured input",
      });
    }
  }

  return signals;
}

// ── Combined readout ──────────────────────────────────────────────────────

interface CombinedReadout {
  outlook: string;
  outlookColor: string;
  confidence: string;
  confidenceNum: number;
  horizon: string;
  upwardDrivers: string[];
  offsets: string[];
  watchlist: string[];
  sourceCount: number;
  signalCount: number;
  reasoning: string;
}

function buildCombinedReadout(
  domain: DomainId,
  parsedResult: ParsedResult | null,
  csvSignals: UploadedFileSignal[],
  uploadedFiles: UploadedSource[],
): CombinedReadout {
  const domLabel = DOMAINS[domain].label.toLowerCase();
  const horizonMap: Record<DomainId, string> = { mining: "2\u20134 weeks", freight: "2\u20134 weeks", agriculture: "3\u20136 weeks", custom: "2\u20134 weeks" };

  const allDirections: { direction: string; strength: string; signal: string }[] = [];

  if (parsedResult) {
    for (const s of parsedResult.extractedSignals) {
      allDirections.push({ direction: s.direction, strength: s.strength >= 75 ? "High" : s.strength >= 50 ? "Medium" : "Low", signal: s.label });
    }
  }
  for (const s of csvSignals) {
    allDirections.push({ direction: s.direction, strength: s.strength, signal: s.signal });
  }

  const bullish = allDirections.filter((d) => d.direction === "Bullish");
  const bearish = allDirections.filter((d) => d.direction === "Bearish");
  const mixed = allDirections.filter((d) => d.direction === "Mixed");

  const upwardDrivers = bullish.map((d) => d.signal);
  const offsets = bearish.map((d) => d.signal);
  const watchlist = mixed.map((d) => d.signal).concat(allDirections.filter((d) => d.direction === "Watch").map((d) => d.signal));

  // Score: Bullish High +3, Med +2, Low +1; Bearish High -3, Med -2, Low -1; Mixed +0.5 if net bullish
  const strengthScore = (s: string, dir: string): number => {
    const base = s === "High" ? 3 : s === "Medium" ? 2 : 1;
    if (dir === "Bullish") return base;
    if (dir === "Bearish") return -base;
    return 0;
  };
  const netScore = allDirections.reduce((acc, d) => acc + strengthScore(d.strength, d.direction), 0)
    + mixed.length * (bullish.length > bearish.length ? 0.5 : 0);

  let outlook: string;
  let outlookColor: string;
  if (netScore >= 4) { outlook = "Bullish"; outlookColor = C.green; }
  else if (netScore >= 1.5) { outlook = "Mildly bullish"; outlookColor = C.green; }
  else if (netScore > -1.5) { outlook = "Mixed"; outlookColor = C.amber; }
  else { outlook = "Bearish"; outlookColor = C.red; }

  // Confidence: weighted average of all signals
  const confValues = [
    ...(parsedResult ? parsedResult.extractedSignals.map((s) => s.confidence) : []),
    ...csvSignals.map((s) => s.confidence),
  ];
  const avgConf = confValues.length > 0 ? Math.round(confValues.reduce((a, b) => a + b, 0) / confValues.length) : 0;
  const confLabel = avgConf >= 75 ? "medium-high" : avgConf >= 60 ? "moderate" : "low";

  const sourceCount = uploadedFiles.length + (parsedResult?.urlSource ? 1 : 0) + (parsedResult?.noteSnippet ? 1 : 0);
  const signalCount = allDirections.length;

  const driversText = upwardDrivers.length > 0 ? `Upward drivers: ${upwardDrivers.join(", ")}.` : "";
  const offsetText = offsets.length > 0 ? `${offsets.join(", ")} ${offsets.length === 1 ? "is" : "are"} a partial offset.` : "";
  const reasoning = `${outlook} ${domLabel} outlook over ${horizonMap[domain]}. ${driversText} ${offsetText} Confidence is ${confLabel} (${avgConf}%) based on ${signalCount} directional signal${signalCount !== 1 ? "s" : ""} from ${sourceCount} source${sourceCount !== 1 ? "s" : ""}.`.replace(/  +/g, " ").trim();

  return {
    outlook, outlookColor,
    confidence: `${avgConf}%`, confidenceNum: avgConf,
    horizon: horizonMap[domain],
    upwardDrivers, offsets, watchlist,
    sourceCount, signalCount, reasoning,
  };
}

// ── Chart adjustment ─────────────────────────────────────────────────────

type ChartRow = { period: string; actual?: number; baseline?: number; forecast?: number; lower?: number; bandWidth?: number; phase: ChartPhase };

function computeSignalScore(csvSignals: UploadedFileSignal[]): number {
  let score = 0;
  for (const s of csvSignals) {
    const base = s.strength === "High" ? 3 : s.strength === "Medium" ? 2 : 1;
    if (s.direction === "Bullish") score += base;
    else if (s.direction === "Bearish") score -= base;
    else if (s.direction === "Mixed") score += 0.5;
  }
  return score;
}

function adjustChartData(
  baseData: ChartRow[],
  csvSignals: UploadedFileSignal[],
  overrideSignalPct?: number,
  overrideBandPct?: number,
): { chartData: ChartRow[]; adjusted: boolean } {
  // Always populate baseline from original forecast values
  const withBaseline = baseData.map((row) => ({
    ...row,
    baseline: row.forecast,
  }));

  if (csvSignals.length === 0 && overrideSignalPct === undefined) return { chartData: withBaseline, adjusted: false };

  // Use override from LLM chart guidance if available; otherwise compute from signals
  const score = overrideSignalPct !== undefined ? overrideSignalPct : computeSignalScore(csvSignals);
  // shiftPerStep: spread the total signal_change_pct across 8 forecast steps → per-step increment
  const shiftPerStep = overrideSignalPct !== undefined ? score / 8 : score * 0.35;
  // Band: use override band pct spread across steps, or compute from bearish signal count
  const bearishCount = csvSignals.filter((s) => s.direction === "Bearish" || s.direction === "Mixed").length;
  const bandExtra = overrideBandPct !== undefined ? overrideBandPct / 10 : bearishCount * 0.8;

  let forecastIdx = 0;
  const adjusted = withBaseline.map((row) => {
    if (row.forecast !== undefined && row.actual === undefined) {
      forecastIdx++;
      const shift = shiftPerStep * forecastIdx;
      const newForecast = +(row.forecast + shift).toFixed(1);
      const newBandWidth = row.bandWidth !== undefined ? +(row.bandWidth + bandExtra * forecastIdx * 0.3).toFixed(1) : undefined;
      const newLower = row.lower !== undefined && newBandWidth !== undefined ? +(newForecast - newBandWidth).toFixed(1) : row.lower;
      return { ...row, forecast: newForecast, lower: newLower, bandWidth: newBandWidth };
    }
    // Transition point (has both actual and forecast)
    if (row.forecast !== undefined && row.actual !== undefined) {
      return { ...row };
    }
    return row;
  });

  return { chartData: adjusted, adjusted: true };
}

function buildAdjustedMetrics(
  baseMetrics: { label: string; value: string; color: string }[],
  csvSignals: UploadedFileSignal[],
  readout: CombinedReadout,
): { label: string; value: string; color: string }[] {
  if (csvSignals.length === 0) return baseMetrics;
  return baseMetrics.map((m) => {
    if (m.label === "Forecast bias") return { ...m, value: readout.outlook, color: readout.outlookColor };
    if (m.label === "Confidence") return { ...m, value: readout.confidence };
    if (m.label === "Model mode") return { ...m, value: "Source-adjusted" };
    return m;
  });
}

function buildAdjustedSummaryMetrics(
  baseMetrics: { label: string; value: string; color: string }[],
  readout: CombinedReadout | null,
): { label: string; value: string; color: string }[] {
  if (!readout) return baseMetrics;
  return baseMetrics.map((m) => {
    if (m.label === "Forecast pressure") return { ...m, value: readout.outlook, color: readout.outlookColor };
    if (m.label === "Confidence") return { ...m, value: readout.confidence };
    return m;
  });
}

// ── Short feature key helper ─────────────────────────────────────────────

const SIGNAL_KEY_MAP: Record<string, string> = {
  "Asia-Pacific port congestion remains elevated": "port_congestion_pressure",
  "Freight rate pressure is mixed but still elevated versus prior period": "freight_rate_pressure",
  "Bunker fuel easing provides a partial cost-pressure offset": "bunker_fuel_offset",
  "Bunker fuel easing provides partial offset": "bunker_fuel_offset",
  "Inventory drawdown supports upward price pressure": "inventory_drawdown",
  "Production disruption increases supply risk": "production_disruption",
  "Shipment delays tighten nearby availability": "vessel_delay_pressure",
  "Smelter demand supports consumption signal": "smelter_demand",
  "Commodity price signal detected": "commodity_price_signal",
  "Weather stress raises yield risk": "weather_yield_risk",
  "Export inspections support demand": "export_demand",
  "Stock-to-use tightening supports upward pressure": "stock_to_use_tightening",
  "Planting progress changes seasonal risk": "planting_seasonal_risk",
};

function signalToFeatureKey(signal: string): string {
  return SIGNAL_KEY_MAP[signal] || signal.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28);
}

// ── Active intelligence state ─────────────────────────────────────────────

interface ActiveIntelligence {
  hasSourceInput: boolean;
  signals: Signal[];
  drivers: { name: string; contribution: number }[];
  reasoning: { headline: string; body: string };
  chartEvents: { period: string; value: number; label: string; direction?: "up" | "down" | "neutral" }[];
  summaryMetrics: { label: string; value: string; color: string }[];
  chartMetrics: { label: string; value: string; color: string }[];
  risks: string[];
  features: { name: string; value: number; direction: string; directionColor: string; source: string }[];
  evidence: string[];
}

function getActiveIntelligence(
  domain: DomainId,
  parsedResult: ParsedResult | null,
  csvSignals: UploadedFileSignal[],
  combinedReadout: CombinedReadout | null,
): ActiveIntelligence {
  const d = DOMAINS[domain];
  const baseDc = DOMAIN_CHARTS[domain];

  // Collect all source-derived signals
  const noteSignals: ParsedSignal[] = parsedResult
    ? parsedResult.extractedSignals.filter((s) => s.label !== "General market signal")
    : [];
  const hasSourceInput = noteSignals.length > 0 || csvSignals.length > 0;

  if (!hasSourceInput) {
    return {
      hasSourceInput: false,
      signals: d.signals,
      drivers: d.drivers,
      reasoning: d.reasoning,
      chartEvents: baseDc.events,
      summaryMetrics: baseDc.summaryMetrics,
      chartMetrics: baseDc.metrics,
      risks: d.brief.risks,
      features: d.brief.features,
      evidence: d.brief.evidence,
    };
  }

  // Build signals table rows from source-derived signals
  const dirColor = (dir: string) => dir === "Bullish" ? C.green : dir === "Bearish" ? C.red : dir === "Mixed" ? C.amber : "#6b7280";
  const activeSignals: Signal[] = [
    ...noteSignals.map((s) => ({
      name: s.label,
      direction: s.direction,
      directionColor: s.directionColor,
      strength: s.strength,
      confidence: `${s.confidence}%`,
    })),
    ...csvSignals.map((s) => ({
      name: s.signal,
      direction: s.direction,
      directionColor: dirColor(s.direction),
      strength: s.strength === "High" ? 82 : s.strength === "Medium" ? 68 : 50,
      confidence: `${s.confidence}%`,
    })),
  ];

  // Build drivers from source signals
  const allSigEntries = [
    ...noteSignals.map((s) => ({ name: s.label, dir: s.direction, str: s.strength })),
    ...csvSignals.map((s) => ({ name: s.signal, dir: s.direction, str: s.strength === "High" ? 82 : s.strength === "Medium" ? 68 : 50 })),
  ];
  const activeDrivers = allSigEntries
    .sort((a, b) => b.str - a.str)
    .slice(0, 6)
    .map((s) => ({
      name: s.name,
      contribution: s.dir === "Bullish" ? Math.round(s.str * 0.35)
        : s.dir === "Bearish" ? -Math.round(s.str * 0.25)
        : Math.round(s.str * 0.1),
    }));

  // Build reasoning
  const readout = combinedReadout;
  const headline = readout ? `${readout.outlook} outlook` : parsedResult?.forecastImpact || "Source-derived intelligence";
  const body = readout?.reasoning || parsedResult?.reasoning || d.reasoning.body;

  // Build chart events from top 2-3 source signals
  const chartBase = baseDc.chartData;
  const actualPoints = chartBase.filter((r) => r.actual !== undefined);
  const eventCandidates = activeSignals.slice(0, 3);
  const eventPeriods = actualPoints.length >= 3
    ? [actualPoints[Math.floor(actualPoints.length * 0.4)], actualPoints[Math.floor(actualPoints.length * 0.8)], actualPoints[actualPoints.length - 1]]
    : actualPoints.slice(-3);
  const activeEvents = eventCandidates.map((sig, i) => {
    const pt = eventPeriods[i] || eventPeriods[eventPeriods.length - 1];
    const dir: "up" | "down" | "neutral" = sig.direction === "Bullish" ? "up" : sig.direction === "Bearish" ? "down" : "neutral";
    return { period: pt.period, value: pt.actual || 100, label: sig.name.slice(0, 24), direction: dir };
  });

  // Summary metrics
  const outlookVal = readout?.outlook || parsedResult?.forecastImpact || "Mixed";
  const outlookCol = readout?.outlookColor || (outlookVal.includes("Bullish") || outlookVal.includes("bullish") ? C.green : C.amber);
  const confVal = readout?.confidence || `${parsedResult?.confidence || 65}%`;
  const mixedCount = activeSignals.filter((s) => s.direction === "Mixed" || s.direction === "Watch").length;
  const volRisk = mixedCount >= 3 ? "High" : mixedCount >= 1 ? "Medium" : "Low";
  const volColor = volRisk === "High" ? C.red : volRisk === "Medium" ? C.amber : C.green;
  const horizon = readout?.horizon || (domain === "agriculture" ? "3\u20136 weeks" : "2\u20134 weeks");

  const activeSummaryMetrics = [
    { label: "Forecast pressure", value: outlookVal, color: outlookCol },
    { label: "Confidence", value: confVal, color: C.text },
    { label: "Volatility risk", value: volRisk, color: volColor },
    { label: "Horizon", value: horizon, color: C.text },
  ];

  // Chart right-side metrics
  const topDriver = activeDrivers.length > 0 ? activeDrivers[0].name : "Source signals";
  const activeChartMetrics = [
    { label: "Forecast bias", value: outlookVal, color: outlookCol },
    { label: "30-day signal change", value: readout ? (readout.confidenceNum >= 70 ? "+2.8%" : "+1.4%") : "+1.0%", color: C.green },
    { label: "Confidence", value: confVal, color: C.text },
    { label: "Uncertainty band", value: mixedCount >= 2 ? "\u00B18.5%" : "\u00B15.4%", color: mixedCount >= 2 ? C.amber : C.text },
    { label: "Top driver", value: topDriver.length > 28 ? topDriver.slice(0, 26) + "\u2026" : topDriver, color: C.text },
    { label: "Model mode", value: "Source-adjusted", color: C.textMuted },
  ];

  // Features for Screen 3
  const activeFeatures = [
    ...noteSignals.slice(0, 5).map((s) => ({
      name: signalToFeatureKey(s.label),
      value: +(s.strength / 100).toFixed(2),
      direction: s.direction,
      directionColor: s.directionColor,
      source: parsedResult?.urlSource ? "URL" : "Note",
    })),
    ...csvSignals.map((s) => ({
      name: signalToFeatureKey(s.signal),
      value: +(s.confidence / 100).toFixed(2),
      direction: s.direction as string,
      directionColor: dirColor(s.direction),
      source: "CSV",
    })),
  ];

  // Evidence
  const activeEvidence = [
    ...(parsedResult?.urlSource ? [`URL source: ${parsedResult.urlSource}`] : []),
    ...(parsedResult?.noteSnippet ? [`Parsed note: ${parsedResult.noteSnippet}`] : []),
    ...csvSignals.map((s) => `${s.fileName}: ${s.evidence}`),
  ];

  // Risks from combined readout watchlist + offsets
  const activeRisks = [
    ...(readout?.watchlist || []).map((w) => `${w} remains a risk factor`),
    ...(readout?.offsets || []).map((o) => `${o} may reverse`),
    ...(activeRisks_remaining(activeSignals)),
  ].slice(0, 4);

  return {
    hasSourceInput: true,
    signals: activeSignals,
    drivers: activeDrivers,
    reasoning: { headline, body },
    chartEvents: activeEvents,
    summaryMetrics: activeSummaryMetrics,
    chartMetrics: activeChartMetrics,
    risks: activeRisks.length > 0 ? activeRisks : d.brief.risks,
    features: activeFeatures.length > 0 ? activeFeatures : d.brief.features,
    evidence: activeEvidence.length > 0 ? activeEvidence : d.brief.evidence,
  };
}

function activeRisks_remaining(signals: Signal[]): string[] {
  const highStr = signals.filter((s) => s.strength >= 75 && (s.direction === "Bullish" || s.direction === "Mixed"));
  return highStr.length > 0 ? [`Signal concentration risk — ${highStr.length} high-strength indicator${highStr.length > 1 ? "s" : ""}`] : [];
}

// ── LLM response → ActiveIntelligence mapper ─────────────────────────────

// ── Chart guidance normalization ──────────────────────────────────────────

function normalizeChartGuidance(cg: LLMChartGuidance, outlook: string): { signalPct: number; bandPct: number } {
  const ol = outlook.toLowerCase();
  let minSig: number, maxSig: number, minBand: number, maxBand: number;
  if (ol.includes("bullish") && !ol.includes("mildly")) {
    minSig = 3.5; maxSig = 5.5; minBand = 6; maxBand = 10;
  } else if (ol.includes("mildly") || (ol.includes("bullish") && ol.includes("mild"))) {
    minSig = 2.5; maxSig = 5.0; minBand = 6; maxBand = 10;
  } else if (ol.includes("bearish")) {
    minSig = -5.5; maxSig = -2.5; minBand = 6; maxBand = 10;
  } else if (ol.includes("mixed") && ol.includes("upward")) {
    minSig = 1.0; maxSig = 3.0; minBand = 7; maxBand = 11;
  } else {
    minSig = -1.0; maxSig = 1.5; minBand = 6; maxBand = 10;
  }
  const rawSig = cg.signal_change_pct;
  const signalPct = (rawSig >= minSig && rawSig <= maxSig) ? rawSig : +((minSig + maxSig) / 2).toFixed(1);
  const rawBand = cg.uncertainty_band_pct;
  const bandPct = (rawBand >= minBand && rawBand <= maxBand) ? rawBand : +((minBand + maxBand) / 2).toFixed(1);
  return { signalPct, bandPct };
}

function shortenEventLabel(label: string): string {
  if (label.length <= 22) return label;
  const abbrevs: [RegExp, string][] = [
    [/world container index/i, "WCI"],
    [/container.*index/i, "Container index"],
    [/increasing demand.*shipping/i, "Route demand"],
    [/bunker fuel.*drop/i, "Fuel offset"],
    [/bunker fuel.*eas/i, "Fuel offset"],
    [/port congestion/i, "Port congestion"],
    [/freight rate/i, "Rate signal"],
    [/supply chain/i, "Supply chain"],
    [/vessel.*availab/i, "Vessel supply"],
    [/benchmark.*track/i, "Benchmark tracked"],
  ];
  for (const [re, short] of abbrevs) {
    if (re.test(label)) return short;
  }
  return label.slice(0, 20) + "\u2026";
}

function mapLLMToActiveIntelligence(llm: LLMResponse, domain: DomainId): ActiveIntelligence {
  const baseDc = DOMAIN_CHARTS[domain];
  const dirColor = (dir: string) =>
    dir === "Bullish" ? C.green : dir === "Bearish" ? C.red : dir === "Mixed" ? C.amber : "#6b7280";

  const signals: Signal[] = llm.signals.map((s) => ({
    name: s.label,
    direction: s.direction,
    directionColor: dirColor(s.direction),
    strength: s.strength === "High" ? 82 : s.strength === "Medium" ? 68 : 50,
    confidence: `${s.confidence}%`,
  }));

  const drivers: { name: string; contribution: number }[] = [
    ...llm.upward_drivers.map((d, i) => ({ name: d, contribution: Math.max(10, 30 - i * 6) })),
    ...llm.offsets.map((d) => ({ name: d, contribution: -15 })),
  ].slice(0, 6);

  const outlookColor = dirColor(
    llm.outlook.toLowerCase().includes("bullish") ? "Bullish"
    : llm.outlook.toLowerCase().includes("bearish") ? "Bearish"
    : "Mixed"
  );

  // Normalize chart guidance values
  const { signalPct, bandPct } = normalizeChartGuidance(llm.chart_guidance, llm.outlook);

  const chartBase = baseDc.chartData;
  const actualPoints = chartBase.filter((r) => r.actual !== undefined);
  const chartEvents = llm.chart_guidance.event_markers.slice(0, 3).map((label, i) => {
    const idx = Math.min(Math.floor(actualPoints.length * (0.4 + i * 0.25)), actualPoints.length - 1);
    const pt = actualPoints[idx] || actualPoints[actualPoints.length - 1];
    const dir: "up" | "down" | "neutral" = llm.outlook.toLowerCase().includes("bullish") ? "up" : llm.outlook.toLowerCase().includes("bearish") ? "down" : "neutral";
    return { period: pt.period, value: pt.actual || 100, label: shortenEventLabel(label), direction: dir };
  });

  const volColor = llm.volatility_risk.toLowerCase().includes("high") ? C.red
    : llm.volatility_risk.toLowerCase().includes("medium") ? C.amber : C.green;

  const summaryMetrics = [
    { label: "Forecast pressure", value: llm.forecast_pressure, color: outlookColor },
    { label: "Confidence", value: `${llm.confidence}%`, color: C.text },
    { label: "Volatility risk", value: llm.volatility_risk, color: volColor },
    { label: "Horizon", value: llm.horizon, color: C.text },
  ];

  const topDriver = llm.chart_guidance.top_driver || (drivers[0]?.name ?? "Source signals");
  const signalColor = signalPct >= 0 ? C.green : C.red;
  const chartMetrics = [
    { label: "Forecast bias", value: llm.chart_guidance.bias || llm.outlook, color: outlookColor },
    { label: "30-day signal change", value: `${signalPct >= 0 ? "+" : ""}${signalPct.toFixed(1)}%`, color: signalColor },
    { label: "Confidence", value: `${llm.confidence}%`, color: C.text },
    { label: "Uncertainty band", value: `\u00B1${bandPct.toFixed(1)}%`, color: bandPct > 8 ? C.amber : C.text },
    { label: "Top driver", value: topDriver, color: C.text },
    { label: "Model mode", value: "LLM-structured", color: C.textMuted },
  ];

  const features = llm.training_signals.map((t) => ({
    name: t.feature.slice(0, 28),
    value: parseFloat(t.value) || 0,
    direction: t.direction,
    directionColor: dirColor(t.direction),
    source: t.source,
  }));

  const evidence = llm.source_evidence.map((e) => `${e.source}: ${e.evidence}`);

  const risks = [
    ...llm.watchlist.map((w) => `${w} remains a risk factor`),
    ...llm.offsets.map((o) => `${o} may reverse`),
  ].slice(0, 4);

  return {
    hasSourceInput: true,
    signals,
    drivers,
    reasoning: { headline: `${llm.outlook} outlook`, body: llm.reasoning },
    chartEvents,
    summaryMetrics,
    chartMetrics,
    risks: risks.length > 0 ? risks : DOMAINS[domain].brief.risks,
    features: features.length > 0 ? features : DOMAINS[domain].brief.features,
    evidence: evidence.length > 0 ? evidence : DOMAINS[domain].brief.evidence,
  };
}

// ── AddDomainModal ──────────────────────────────────────────────────────────

function AddDomainModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "14px", padding: "32px",
          width: "460px", maxWidth: "calc(100vw - 40px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.16)", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "14px",
            background: "none", border: "none", cursor: "pointer",
            fontSize: "18px", color: C.textFaint, lineHeight: 1,
          }}
        >✕</button>

        <h2 style={{ fontSize: "18px", fontWeight: 600, color: C.text, margin: "0 0 4px" }}>
          Add new domain / market
        </h2>
        <p style={{ fontSize: "13px", color: C.textMuted, margin: "0 0 22px" }}>
          Configure a new market domain for signal collection and analysis.
        </p>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "5px" }}>
            Domain name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Energy — LNG spot rates"
            style={{
              width: "100%", padding: "9px 13px", background: C.inputBg,
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              fontSize: "13px", color: C.text, outline: "none",
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>
        {[
          { label: "Key drivers", placeholder: "e.g. supply, demand, weather, FX" },
          { label: "Typical source types", placeholder: "e.g. URL, CSV, API, PDF" },
          { label: "Forecast horizon", placeholder: "e.g. 2–4 weeks" },
        ].map((f) => (
          <div key={f.label} style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "5px" }}>
              {f.label}
            </label>
            <input
              placeholder={f.placeholder}
              style={{
                width: "100%", padding: "9px 13px", background: C.inputBg,
                border: `1px solid ${C.borderInput}`, borderRadius: "8px",
                fontSize: "13px", color: C.text, outline: "none",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
          <button
            onClick={() => { onAdd(name.trim() || "Custom market"); onClose(); }}
            style={{
              flex: 1, padding: "11px", background: C.green, color: "#fff",
              border: "none", borderRadius: "8px", fontSize: "13px",
              fontWeight: 600, cursor: "pointer",
            }}
          >Add domain</button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px", background: "transparent", color: C.textSec,
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              fontSize: "13px", cursor: "pointer",
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 1: Signal Intake ────────────────────────────────────────────────

function SignalIntake({
  domain, setDomain, onGenerate, onAddDomain, customLabel, parsedResult,
  uploadedFiles, onFilesUploaded, csvSignals, generateStatus, generateError, generatedSources, sourcesDirty,
  onSyncSources, syncStatus,
}: {
  domain: DomainId;
  setDomain: (d: DomainId) => void;
  onGenerate: (url: string, note: string) => void;
  onAddDomain: () => void;
  customLabel: string;
  parsedResult: ParsedResult | null;
  uploadedFiles: UploadedSource[];
  onFilesUploaded: (files: UploadedSource[], txtContent: string | null) => void;
  csvSignals: UploadedFileSignal[];
  generateStatus: GenerateStatus;
  generateError: string | null;
  generatedSources: { name: string; type: string; status: string; quality: string }[];
  sourcesDirty: boolean;
  onSyncSources: () => void;
  syncStatus: "idle" | "syncing" | "done" | "error";
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const d = DOMAINS[domain];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    // Copy files out of the live FileList before any async work or input reset
    const files = Array.from(fileList);
    const results: UploadedSource[] = [];
    let txtContent: string | null = null;
    for (const file of files) {
      const parsed = await parseUploadedFile(file);
      results.push(parsed);
      if (parsed.extension === "txt" && parsed.status === "parsed") {
        const content = await file.text();
        txtContent = txtContent ? txtContent + "\n\n" + content : content;
      }
    }
    onFilesUploaded(results, txtContent);
    if (txtContent) {
      setNote((prev) => prev ? prev + "\n\n" + txtContent : txtContent!);
    }
  };
  const domainLabel = domain === "custom" && customLabel ? customLabel : d.label;
  const domainHint = detectSourceDomainHint(url, note, uploadedFiles);
  const hasMismatch = domainHint !== null && domainHint !== domain;

  return (
    <div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 370px", gap: "18px" }}>
        {/* Left */}
        <div style={card}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 14px" }}>Market setup</h3>

          <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>
            Market / domain
          </label>
          <div style={{ display: "flex", gap: "10px", position: "relative" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <button
                onClick={() => setDropOpen((v) => !v)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 13px", background: C.inputBg, border: `1px solid ${C.borderInput}`,
                  borderRadius: "8px", fontSize: "13px", color: C.text, cursor: "pointer",
                }}
              >
                <span>{domainLabel}</span>
                <span style={{ color: C.textMuted, fontSize: "11px" }}>▾</span>
              </button>
              {dropOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    onClick={() => setDropOpen(false)}
                  />
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "#fff", border: `1px solid ${C.borderInput}`, borderRadius: "8px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.10)", zIndex: 50, overflow: "hidden",
                  }}>
                    {(Object.keys(DOMAINS) as DomainId[]).filter((id) => id !== "custom" || customLabel).map((id) => (
                      <button
                        key={id}
                        onClick={() => { setDomain(id); setDropOpen(false); }}
                        style={{
                          width: "100%", padding: "9px 13px", textAlign: "left",
                          fontSize: "13px", background: id === domain ? C.greenSubtle : "transparent",
                          color: id === domain ? C.green : C.text, border: "none", cursor: "pointer",
                        }}
                      >
                        {id === "custom" && customLabel ? customLabel : DOMAINS[id].label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onAddDomain}
              style={{
                padding: "9px 14px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`,
                borderRadius: "8px", fontSize: "13px", color: C.green, cursor: "pointer",
                fontWeight: 500, whiteSpace: "nowrap",
              }}
            >+ Add new domain</button>
          </div>

          <div style={{ marginTop: "22px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>URL input</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={d.urlPlaceholder}
              style={{
                width: "100%", padding: "9px 13px", background: C.inputBg,
                border: `1px solid ${C.borderInput}`, borderRadius: "8px",
                fontSize: "13px", color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
            <p style={{ fontSize: "11px", color: C.textFaint, margin: "4px 0 0" }}>
              Demo mode: URL text is interpreted locally; no live scraping
            </p>
          </div>

          <div style={{ marginTop: "22px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>
              Upload local demo files
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
              style={{
                border: `1.5px dashed rgba(0,0,0,0.14)`, borderRadius: "8px",
                padding: "22px 20px", textAlign: "center", background: "#fafafa",
                cursor: "pointer", position: "relative",
              }}
              onClick={() => document.getElementById("file-upload-input")?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                multiple
                accept=".txt,.csv,.json"
                style={{ display: "none" }}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
              <p style={{ fontSize: "13px", color: C.textSec, margin: "0 0 4px" }}>
                Drop .txt, .csv, or .json files here, or click to browse
              </p>
              <p style={{ fontSize: "12px", color: C.textFaint, margin: 0 }}>Files are read locally in the browser — nothing is uploaded</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {uploadedFiles.map((uf) => (
                  <div key={uf.id} style={{
                    padding: "10px 13px", background: uf.status === "parsed" ? "#fafafa" : "rgba(217,119,6,0.06)",
                    border: `1px solid ${uf.status === "parsed" ? C.borderSub : "rgba(217,119,6,0.2)"}`,
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: C.text }}>{uf.name}</span>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <span style={{
                          padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 500,
                          background: uf.status === "parsed" ? "rgba(22,163,74,0.10)" : "rgba(217,119,6,0.10)",
                          color: uf.status === "parsed" ? C.green : C.amber,
                        }}>{uf.status === "parsed" ? "Parsed" : uf.status === "warning" ? "Warning" : "Error"}</span>
                        <span style={{
                          padding: "2px 7px", borderRadius: "4px", fontSize: "10px",
                          background: "#f3f4f6", color: C.textMuted,
                        }}>.{uf.extension}</span>
                      </div>
                    </div>
                    {uf.detectedDomain && (
                      <p style={{ fontSize: "11px", color: C.green, margin: "0 0 2px" }}>
                        Domain: {uf.detectedDomain}
                      </p>
                    )}
                    {uf.sourceCategory && (
                      <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 2px" }}>{uf.sourceCategory}</p>
                    )}
                    {uf.columns && (
                      <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 2px" }}>
                        Columns: {uf.columns.join(", ")}
                      </p>
                    )}
                    {(uf.rowCount !== undefined || uf.columnCount !== undefined) && (
                      <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 2px" }}>
                        {uf.rowCount !== undefined ? `${uf.rowCount} rows` : ""}{uf.rowCount !== undefined && uf.columnCount !== undefined ? " / " : ""}{uf.columnCount !== undefined ? `${uf.columnCount} columns` : ""}
                      </p>
                    )}
                    {uf.preview && (
                      <pre style={{
                        fontSize: "11px", color: C.textSec, margin: "4px 0 0",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                        background: "#fff", padding: "6px 8px", borderRadius: "4px",
                        border: `1px solid ${C.borderSub}`, maxHeight: "80px", overflow: "auto",
                        fontFamily: "monospace",
                      }}>{uf.preview}</pre>
                    )}
                    {uf.message && (
                      <p style={{ fontSize: "11px", color: uf.status === "parsed" ? C.green : C.amber, margin: "4px 0 0" }}>
                        {uf.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {csvSignals.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: C.text, margin: "0 0 8px" }}>CSV-derived signals</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {csvSignals.map((sig, i) => {
                    const dirColor = sig.direction === "Bullish" ? C.green : sig.direction === "Bearish" ? C.red : sig.direction === "Mixed" ? C.amber : C.textMuted;
                    return (
                      <div key={i} style={{
                        padding: "10px 13px", background: "rgba(22,163,74,0.04)",
                        border: `1px solid rgba(22,163,74,0.14)`, borderRadius: "8px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 500, color: C.text }}>{sig.signal}</span>
                          <div style={{ display: "flex", gap: "5px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 500, color: dirColor, padding: "2px 6px", background: `${dirColor}15`, borderRadius: "4px" }}>{sig.direction}</span>
                            <span style={{ fontSize: "10px", fontWeight: 500, color: C.textMuted, padding: "2px 6px", background: "#f3f4f6", borderRadius: "4px" }}>{sig.strength}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 2px" }}>{sig.confidence}% confidence</p>
                        <p style={{ fontSize: "11px", color: C.textFaint, margin: "0 0 2px" }}>{sig.fileName}</p>
                        <p style={{ fontSize: "11px", color: C.textFaint, margin: 0 }}>{sig.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: "22px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>
              Configured source sync
            </label>
            <div style={{
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              padding: "14px 16px", background: "#fafafa",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: "12px", color: C.textSec, margin: "0 0 2px" }}>
                  Sync files from configured scraper output folders or market-data drop locations.
                </p>
                <p style={{ fontSize: "11px", color: C.textFaint, margin: 0 }}>
                  Demo reads from sample_data/sync_drop
                </p>
              </div>
              <button
                onClick={onSyncSources}
                disabled={syncStatus === "syncing"}
                style={{
                  padding: "8px 16px", background: syncStatus === "syncing" ? C.textFaint : C.greenSubtle,
                  border: `1px solid ${C.greenBorder}`, borderRadius: "8px",
                  fontSize: "12px", fontWeight: 500, color: C.green,
                  cursor: syncStatus === "syncing" ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", opacity: syncStatus === "syncing" ? 0.7 : 1,
                }}
              >{syncStatus === "syncing" ? "Syncing..." : syncStatus === "done" ? "Re-sync sources" : "Sync configured sources"}</button>
            </div>
            {syncStatus === "error" && (
              <p style={{ fontSize: "11px", color: C.red, margin: "4px 0 0" }}>Sync failed. Ensure the backend is running.</p>
            )}
          </div>

          <div style={{ marginTop: "22px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>
              Paste market note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={d.notePlaceholder}
              rows={4}
              style={{
                width: "100%", padding: "9px 13px", background: C.inputBg,
                border: `1px solid ${C.borderInput}`, borderRadius: "8px",
                fontSize: "13px", color: C.text, outline: "none", resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Right */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 12px" }}>
            Parsed source preview
          </h3>

          {(() => {
            // Use snapshot from last generate run if available; otherwise build from live inputs
            const currentSources: PreviewSource[] =
              generatedSources.length > 0 ? generatedSources : buildSourcePreview(url, note, uploadedFiles);

            // Real source count: URL + note (only if not from TXT upload) + all parsed files
            const hasTxtFile = uploadedFiles.some((f) => f.status === "parsed" && f.extension === "txt" && f.sourceCategory !== "Configured sync");
            const realCount = (url ? 1 : 0) + (note && !hasTxtFile ? 1 : 0) + uploadedFiles.filter((f) => f.status === "parsed").length;
            const hasAnySrc = currentSources.length > 0;

            return hasAnySrc ? (
              <>
                <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: sourcesDirty ? "8px" : "14px" }}>
                  {[
                    { text: `${realCount} source${realCount !== 1 ? "s" : ""} parsed`, green: true },
                    ...(generateStatus === "done" && !sourcesDirty ? [{ text: "Ready", green: true }] : []),
                    ...(sourcesDirty ? [{ text: "Changed", green: false }] : []),
                  ].map((chip) => (
                    <span key={chip.text} style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: chip.green ? 500 : 400,
                      background: chip.green ? C.greenSubtle : chip.text === "Changed" ? "rgba(217,119,6,0.10)" : "#f3f4f6",
                      border: `1px solid ${chip.green ? C.greenBorder : chip.text === "Changed" ? "rgba(217,119,6,0.25)" : C.border}`,
                      color: chip.green ? C.green : chip.text === "Changed" ? C.amber : C.textSec,
                    }}>{chip.text}</span>
                  ))}
                </div>
                {sourcesDirty && (
                  <p style={{ fontSize: "11px", color: C.amber, margin: "0 0 10px" }}>Sources changed — regenerate to refresh intelligence</p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflowX: "hidden" }}>
                  {currentSources.map((src, i) => (
                    <div key={i} style={{
                      padding: "8px 11px", background: "#fafafa",
                      border: `1px solid ${C.borderSub}`, borderRadius: "7px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: "8px", minWidth: 0,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: "12px", fontWeight: 500, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.name}</p>
                        <p style={{ fontSize: "10px", color: C.textFaint, margin: "1px 0 0" }}>{src.type}</p>
                        {src.subtitle && <p style={{ fontSize: "10px", color: C.textMuted, margin: "1px 0 0" }}>{src.subtitle}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <span style={{ padding: "2px 6px", background: "#f3f4f6", borderRadius: "4px", fontSize: "10px", color: C.textSec }}>{src.status}</span>
                        <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px",
                          background: src.quality === "High" ? "rgba(22,163,74,0.10)" : "#f3f4f6",
                          color: src.quality === "High" ? C.green : C.textMuted,
                          fontWeight: src.quality === "High" ? 500 : 400,
                        }}>{src.quality}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 20px" }}>
                <p style={{ fontSize: "13px", color: C.textFaint, textAlign: "center", margin: 0, lineHeight: 1.65 }}>
                  No sources parsed yet.<br />Add a URL, upload files, or paste a note to generate market signals.
                </p>
              </div>
            );
          })()}

          {uploadedFiles.length > 0 && (() => {
            const parsedCount = uploadedFiles.filter((f) => f.status === "parsed").length;
            const csvCount = uploadedFiles.filter((f) => f.extension === "csv" && f.status === "parsed").length;
            const domainAligned = uploadedFiles.filter((f) => f.detectedDomain === domain).length;
            const steps = [
              { text: `${parsedCount} local source file${parsedCount !== 1 ? "s" : ""} parsed`, ok: parsedCount > 0 },
              ...(csvCount > 0 ? [{ text: `${csvSignals.length} structured CSV signal${csvSignals.length !== 1 ? "s" : ""} prepared`, ok: csvSignals.length > 0 }] : []),
              ...(domainAligned > 0 ? [{ text: `${domainAligned} file${domainAligned !== 1 ? "s" : ""} aligned to ${DOMAINS[domain].label}`, ok: true }] : []),
              { text: "Ready for combined intelligence", ok: true },
            ];
            return (
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: C.textMuted, margin: "0 0 2px" }}>Source pack status</p>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", color: s.ok ? C.green : C.amber }}>{s.ok ? "\u2713" : "\u26A0"}</span>
                    <span style={{ fontSize: "11px", color: s.ok ? C.textSec : C.amber }}>{s.text}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Domain mismatch warning */}
          {hasMismatch && (() => {
            const hintLabel = DOMAINS[domainHint!]?.label || domainHint!;
            const selLabel = DOMAINS[domain]?.label || domain;
            return (
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(217,119,6,0.06)", border: `1px solid rgba(217,119,6,0.20)`, borderRadius: "8px" }}>
                <p style={{ fontSize: "11px", color: C.amber, fontWeight: 500, margin: "0 0 3px" }}>Source / domain mismatch</p>
                <p style={{ fontSize: "11px", color: C.textSec, margin: 0, lineHeight: 1.5 }}>
                  Sources look <strong>{hintLabel.toLowerCase()}</strong>-related, but the selected domain is <strong>{selLabel}</strong>. Switch the selected domain or remove mismatched sources to generate intelligence.
                </p>
              </div>
            );
          })()}

          {generateStatus === "analysing" && (
            <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(22,163,74,0.06)", border: `1px solid rgba(22,163,74,0.18)`, borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "14px", animation: "spin 1s linear infinite", display: "inline-block" }}>&#9696;</span>
              <span style={{ fontSize: "13px", color: C.green, fontWeight: 500 }}>Analysing sources...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {generateStatus === "error" && generateError && (
            <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(220,38,38,0.06)", border: `1px solid rgba(220,38,38,0.18)`, borderRadius: "8px" }}>
              <p style={{ fontSize: "12px", color: C.red, fontWeight: 500, margin: "0 0 4px" }}>Intelligence service unavailable</p>
              <p style={{ fontSize: "11px", color: C.textSec, margin: 0 }}>{generateError}</p>
              <p style={{ fontSize: "11px", color: C.textFaint, margin: "4px 0 0" }}>Deterministic fallback was used. Start the backend and confirm the API key for LLM intelligence.</p>
            </div>
          )}

          {generateStatus === "done" && (
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {["Market signals generated", "Decision pack refreshed", "Source intelligence ready"].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: C.green }}>{"\u2713"}</span>
                  <span style={{ fontSize: "11px", color: C.green, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => onGenerate(url, note)}
            disabled={generateStatus === "analysing" || hasMismatch}
            style={{
              marginTop: "18px", width: "100%", padding: "12px",
              background: hasMismatch ? C.textFaint : generateStatus === "analysing" ? C.textFaint : C.green,
              color: "#fff", border: "none",
              borderRadius: "8px", fontSize: "14px", fontWeight: 600,
              cursor: (generateStatus === "analysing" || hasMismatch) ? "not-allowed" : "pointer",
              opacity: (generateStatus === "analysing" || hasMismatch) ? 0.7 : 1,
            }}
          >{generateStatus === "analysing" ? "Analysing..." : "Generate market signals"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Signal Intelligence ──────────────────────────────────────────

function SignalIntelligence({ domain, onGenerate, parsedResult, csvSignals, combinedReadout, activeIntel, generateStatus, generateError, llmResponse, sourcesDirty }: { domain: DomainId; onGenerate: () => void; parsedResult: ParsedResult | null; csvSignals: UploadedFileSignal[]; combinedReadout: CombinedReadout | null; activeIntel: ActiveIntelligence; generateStatus: GenerateStatus; generateError: string | null; llmResponse: LLMResponse | null; sourcesDirty: boolean }) {
  const baseDc = DOMAIN_CHARTS[domain];
  const hasSource = activeIntel.hasSourceInput;
  // Chart: adjust from all source signals (note + CSV)
  const allSignalScores: UploadedFileSignal[] = [
    ...(parsedResult ? parsedResult.extractedSignals.filter(s => s.label !== "General market signal").map(s => ({
      fileName: "note", domain: domain as DomainId, sourceCategory: "Note", signal: s.label,
      direction: (s.direction === "Bullish" ? "Bullish" : s.direction === "Bearish" ? "Bearish" : s.direction === "Mixed" ? "Mixed" : "Neutral") as "Bullish" | "Bearish" | "Mixed" | "Neutral",
      strength: (s.strength >= 75 ? "High" : s.strength >= 50 ? "Medium" : "Low") as "Low" | "Medium" | "High",
      confidence: s.confidence, evidence: s.evidence, forecastUse: "",
    })) : []),
    ...csvSignals,
  ];
  // Use normalized LLM chart guidance for chart slope/band if available
  const llmNorm = llmResponse ? normalizeChartGuidance(llmResponse.chart_guidance, llmResponse.outlook) : null;
  const { chartData: adjustedChartData, adjusted: chartIsAdjusted } = adjustChartData(
    baseDc.chartData, allSignalScores,
    llmNorm?.signalPct, llmNorm?.bandPct,
  );
  const chartEvents = hasSource ? activeIntel.chartEvents : baseDc.events;
  const summaryMetrics = hasSource ? activeIntel.summaryMetrics : baseDc.summaryMetrics;
  const chartMetrics = hasSource ? activeIntel.chartMetrics : baseDc.metrics;

  return (
    <div>

      {/* Error banner */}
      {generateStatus === "error" && generateError && (
        <div style={{ marginBottom: "14px", padding: "12px 16px", background: "rgba(220,38,38,0.06)", border: `1px solid rgba(220,38,38,0.18)`, borderRadius: "8px" }}>
          <p style={{ fontSize: "12px", color: C.red, fontWeight: 500, margin: "0 0 4px" }}>Intelligence service unavailable — showing deterministic fallback</p>
          <p style={{ fontSize: "11px", color: C.textSec, margin: 0 }}>{generateError}</p>
        </div>
      )}

      {/* LLM source badge */}
      {llmResponse && (
        <div style={{ marginBottom: "14px", padding: "10px 16px", background: "rgba(22,163,74,0.06)", border: `1px solid rgba(22,163,74,0.18)`, borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: C.green, fontWeight: 600 }}>LLM intelligence</span>
          <span style={{ fontSize: "11px", color: C.textMuted }}>Source: {llmResponse.source_type} | Domain: {llmResponse.detected_domain}</span>
        </div>
      )}

      {/* Sources changed banner */}
      {sourcesDirty && (
        <div style={{ marginBottom: "14px", padding: "10px 16px", background: "rgba(217,119,6,0.06)", border: `1px solid rgba(217,119,6,0.18)`, borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: C.amber, fontWeight: 600 }}>Sources changed</span>
          <span style={{ fontSize: "11px", color: C.textMuted }}>New files uploaded — regenerate to refresh intelligence</span>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "18px" }}>
        {summaryMetrics.map((m) => (
          <div key={m.label} style={{ ...card, padding: "12px 16px" }}>
            <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 4px" }}>{m.label}</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: m.color, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: "18px" }}>
        {/* Signals table */}
        <div style={card}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 18px" }}>
            Generated market signals
          </h3>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 90px 1fr 80px",
            padding: "0 13px 10px", borderBottom: `1px solid ${C.borderSub}`,
          }}>
            {["Signal", "Direction", "Strength", "Confidence"].map((h) => (
              <span key={h} style={{ fontSize: "11px", color: C.textFaint, fontWeight: 500 }}>{h}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px" }}>
            {activeIntel.signals.map((sig, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 90px 1fr 80px",
                alignItems: "center", padding: "11px 13px",
                borderRadius: "7px", background: i % 2 === 0 ? "#fafafa" : "transparent",
              }}>
                <span style={{ fontSize: "13px", color: C.text }}>{sig.name}</span>
                <span style={{ fontSize: "13px", color: sig.directionColor, fontWeight: 500 }}>{sig.direction}</span>
                <div style={{ paddingRight: "16px" }}>
                  <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${sig.strength}%`, background: sig.directionColor, borderRadius: "3px" }} />
                  </div>
                </div>
                <span style={{ fontSize: "13px", color: C.textSec }}>{sig.confidence}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 14px" }}>
            Forecast reasoning
          </h3>
          <div style={{
            background: "rgba(22,163,74,0.06)", border: `1px solid rgba(22,163,74,0.18)`,
            borderRadius: "9px", padding: "14px", marginBottom: "18px",
          }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: C.green, margin: "0 0 7px" }}>
              {activeIntel.reasoning.headline}
            </p>
            <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.6 }}>
              {activeIntel.reasoning.body}
            </p>
          </div>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 10px" }}>Top drivers</h4>
          <div style={{ flex: 1 }}>
            {activeIntel.drivers.map((dr, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < activeIntel.drivers.length - 1 ? `1px solid ${C.borderSub}` : "none",
              }}>
                <span style={{ fontSize: "13px", color: C.textSec }}>{dr.name}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: dr.contribution > 0 ? C.green : C.red }}>
                  {dr.contribution > 0 ? `+${dr.contribution}` : dr.contribution}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onGenerate}
            style={{
              marginTop: "18px", width: "100%", padding: "12px",
              background: C.green, color: "#fff", border: "none",
              borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}
          >Generate forecast decision pack</button>
        </div>
      </div>

      {/* Combined market readout */}
      {combinedReadout && (csvSignals.length > 0 || (parsedResult && parsedResult.extractedSignals.some(s => s.direction !== "Watch" || s.confidence > 55))) && (
        <div style={{ ...card, marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
              Combined market readout
            </h3>
            <span style={{
              padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 500,
              background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, color: C.green,
            }}>{combinedReadout.signalCount} signals / {combinedReadout.sourceCount} sources</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, background: `${combinedReadout.outlookColor}15`, border: `1px solid ${combinedReadout.outlookColor}30`, color: combinedReadout.outlookColor }}>{combinedReadout.outlook}</span>
                <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", background: "#f3f4f6", border: `1px solid ${C.border}`, color: C.textSec }}>{combinedReadout.confidence} confidence</span>
                <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", background: "#f3f4f6", border: `1px solid ${C.border}`, color: C.textSec }}>{combinedReadout.horizon}</span>
              </div>
              {combinedReadout.upwardDrivers.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 4px" }}>Upward drivers</p>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {combinedReadout.upwardDrivers.map((d, i) => (
                      <span key={i} style={{ padding: "3px 7px", borderRadius: "4px", fontSize: "11px", background: "rgba(22,163,74,0.08)", color: C.green }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {combinedReadout.offsets.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 4px" }}>Offsets</p>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {combinedReadout.offsets.map((d, i) => (
                      <span key={i} style={{ padding: "3px 7px", borderRadius: "4px", fontSize: "11px", background: "rgba(220,38,38,0.08)", color: C.red }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {combinedReadout.watchlist.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 4px" }}>Watchlist</p>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {combinedReadout.watchlist.map((d, i) => (
                      <span key={i} style={{ padding: "3px 7px", borderRadius: "4px", fontSize: "11px", background: "rgba(217,119,6,0.08)", color: C.amber }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{
              background: "rgba(22,163,74,0.04)", border: `1px solid rgba(22,163,74,0.12)`,
              borderRadius: "9px", padding: "14px",
            }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: C.green, margin: "0 0 6px" }}>Analyst reasoning</p>
              <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.65 }}>{combinedReadout.reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Latest parsed intelligence — only show if note/URL produced meaningful signals (not generic fallback) */}
      {parsedResult && parsedResult.extractedSignals.some(s => s.label !== "General market signal") && (
        <div style={{ ...card, marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
              Latest parsed intelligence
            </h3>
            <span style={{
              padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 500,
              background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, color: C.green,
            }}>Note/URL parsing</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 4px" }}>Source type</p>
              <p style={{ fontSize: "13px", color: C.text, fontWeight: 500, margin: "0 0 12px" }}>{parsedResult.sourceType}</p>
              <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 4px" }}>Parsed entities</p>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "12px" }}>
                {parsedResult.parsedEntities.map((e) => (
                  <span key={e} style={{
                    padding: "3px 8px", borderRadius: "4px", fontSize: "11px",
                    background: "#f3f4f6", color: C.textSec,
                  }}>{e}</span>
                ))}
              </div>
              <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 4px" }}>Forecast impact</p>
              <p style={{ fontSize: "13px", color: parsedResult.forecastImpact === "Upward pressure" ? C.green : C.amber, fontWeight: 500, margin: 0 }}>
                {parsedResult.forecastImpact} &middot; {parsedResult.confidence}% confidence
              </p>
            </div>
            <div style={{
              background: "rgba(22,163,74,0.04)", border: `1px solid rgba(22,163,74,0.12)`,
              borderRadius: "9px", padding: "14px",
            }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: C.green, margin: "0 0 6px" }}>Analyst reasoning</p>
              <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.65 }}>{parsedResult.reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded source signals */}
      {csvSignals.length > 0 && (
        <div style={{ ...card, marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
              Uploaded source signals
            </h3>
            <span style={{
              padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 500,
              background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, color: C.green,
            }}>CSV-derived</span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1.2fr 1.8fr 80px 70px 1.5fr",
            padding: "0 13px 10px", borderBottom: `1px solid ${C.borderSub}`,
          }}>
            {["Source file", "Signal", "Direction", "Confidence", "Forecast use"].map((h) => (
              <span key={h} style={{ fontSize: "11px", color: C.textFaint, fontWeight: 500 }}>{h}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px" }}>
            {csvSignals.map((sig, i) => {
              const dirColor = sig.direction === "Bullish" ? C.green : sig.direction === "Bearish" ? C.red : sig.direction === "Mixed" ? C.amber : C.textMuted;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1.2fr 1.8fr 80px 70px 1.5fr",
                  alignItems: "center", padding: "11px 13px",
                  borderRadius: "7px", background: i % 2 === 0 ? "#fafafa" : "transparent",
                }}>
                  <span style={{ fontSize: "12px", color: C.textMuted, fontFamily: "monospace" }}>{sig.fileName}</span>
                  <span style={{ fontSize: "12px", color: C.text }}>{sig.signal}</span>
                  <span style={{ fontSize: "12px", color: dirColor, fontWeight: 500 }}>{sig.direction}</span>
                  <span style={{ fontSize: "12px", color: C.textSec }}>{sig.confidence}%</span>
                  <span style={{ fontSize: "11px", color: C.textFaint }}>{sig.forecastUse}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analyst Forecast chart */}
      {(() => {
        // ── Derive forecast start divider from data ──
        const forecastStartPeriod = adjustedChartData.find(r => r.actual !== undefined && r.forecast !== undefined)?.period || TIMELINE[7];

        // ── Derive signal window start from data ──
        const signalWindowStart = adjustedChartData.find(r => r.phase === "signal_window")?.period;

        // ── Compute y-axis domain from all plotted values ──
        const allValues: number[] = [];
        for (const r of adjustedChartData) {
          if (r.actual !== undefined) allValues.push(r.actual);
          if (r.baseline !== undefined) allValues.push(r.baseline);
          if (r.forecast !== undefined) allValues.push(r.forecast);
          if (r.lower !== undefined) allValues.push(r.lower);
          if (r.lower !== undefined && r.bandWidth !== undefined) allValues.push(r.lower + r.bandWidth);
        }
        const yMin = Math.floor(Math.min(...allValues) - 3);
        const yMax = Math.ceil(Math.max(...allValues) + 5);

        // ── Compute endpoint values for callouts ──
        const forecastRows = adjustedChartData.filter(r => r.phase === "forecast");
        const lastRow = forecastRows[forecastRows.length - 1];
        const baselineEnd = lastRow?.baseline;
        const forecastEnd = lastRow?.forecast;
        const endpointDelta = baselineEnd !== undefined && forecastEnd !== undefined ? +(forecastEnd - baselineEnd).toFixed(1) : 0;
        const firstForecastRow = forecastRows[0];
        const shiftPct = firstForecastRow?.baseline && baselineEnd !== undefined && forecastEnd !== undefined
          ? +(((forecastEnd - baselineEnd) / firstForecastRow.baseline) * 100).toFixed(1)
          : 0;

        // ── Top drivers for movement explanation ──
        const topDriverMetric = chartMetrics.find(m => m.label === "Top driver");
        const confMetric = chartMetrics.find(m => m.label === "Confidence");
        const volMetric = summaryMetrics.find(m => m.label === "Volatility risk");
        const horizonMetric = summaryMetrics.find(m => m.label === "Horizon");

        return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "18px", marginTop: "18px" }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
              Analyst Forecast
            </h3>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {chartIsAdjusted && (
                <span style={{ fontSize: "10px", fontWeight: 500, color: C.green, padding: "2px 8px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: "10px" }}>
                  Signal-adjusted
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 6px" }}>
            {chartIsAdjusted
              ? "Grey baseline shows market without new signals. Green line shows KIAA signal-adjusted forecast."
              : "Indexed market pressure — historical actuals vs. baseline projection"}
          </p>

          {/* Phase band legend */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "10px" }}>
            {[
              { label: "Historical", color: "#f0f4f8" },
              { label: "Signal window", color: "rgba(217,119,6,0.06)" },
              { label: "Forecast horizon", color: "rgba(22,163,74,0.04)" },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, border: `1px solid rgba(0,0,0,0.08)` }} />
                <span style={{ fontSize: "10px", color: C.textFaint }}>{p.label}</span>
              </div>
            ))}
          </div>

          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={adjustedChartData} margin={{ top: 20, right: 50, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="bandGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(22,163,74,0.12)" />
                    <stop offset="100%" stopColor="rgba(22,163,74,0.04)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: C.textFaint }}
                  axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10, fill: C.textFaint }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <Tooltip content={<ForecastChartTooltip />} />

                {/* Phase background bands via ReferenceAreas */}
                {signalWindowStart && (
                  <ReferenceArea
                    x1={signalWindowStart}
                    x2={forecastStartPeriod}
                    fill="rgba(217,119,6,0.05)"
                    fillOpacity={1}
                    ifOverflow="extendDomain"
                  />
                )}
                <ReferenceArea
                  x1={forecastStartPeriod}
                  x2={adjustedChartData[adjustedChartData.length - 1]?.period}
                  fill="rgba(22,163,74,0.03)"
                  fillOpacity={1}
                  ifOverflow="extendDomain"
                />

                {/* Confidence band / uncertainty cone */}
                <Area
                  stackId="band"
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="transparent"
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Area
                  stackId="band"
                  type="monotone"
                  dataKey="bandWidth"
                  stroke="none"
                  fill="url(#bandGradient)"
                  activeDot={false}
                  isAnimationActive={false}
                />

                {/* Historical actual line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={C.text}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: C.text, stroke: "#fff", strokeWidth: 2 }}
                  name="Historical actual"
                />

                {/* Baseline forecast (grey) */}
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 3, fill: "#94a3b8", stroke: "#fff", strokeWidth: 2 }}
                  name="Baseline forecast"
                />

                {/* Signal-adjusted forecast (green) */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={C.green}
                  strokeWidth={2.5}
                  strokeDasharray={chartIsAdjusted ? "0" : "6 3"}
                  dot={false}
                  activeDot={{ r: 4, fill: C.green, stroke: "#fff", strokeWidth: 2 }}
                  name={chartIsAdjusted ? "Signal-adjusted" : "Forecast"}
                />

                {/* Forecast start divider — derived from data */}
                <ReferenceLine
                  x={forecastStartPeriod}
                  stroke={C.textFaint}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                >
                  <Label
                    value="Forecast start"
                    position="top"
                    offset={6}
                    style={{ fontSize: 10, fill: C.textMuted, fontWeight: 500 }}
                  />
                </ReferenceLine>

                {/* Event / driver markers with direction */}
                {chartEvents.slice(0, 4).map((evt, idx) => {
                  const evDir = (evt as { direction?: string }).direction;
                  const markerColor = evDir === "up" ? C.green : evDir === "down" ? C.red : C.amber;
                  const arrow = evDir === "up" ? "\u2191" : evDir === "down" ? "\u2193" : "\u2022";
                  return (
                  <ReferenceDot
                    key={`${evt.period}-${idx}`}
                    x={evt.period}
                    y={evt.value}
                    r={5}
                    fill={markerColor}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Label
                      value={`${arrow} ${evt.label}`}
                      position={idx % 2 === 0 ? "top" : "bottom"}
                      offset={12}
                      style={{ fontSize: 9, fill: C.textSec, fontWeight: 500 }}
                    />
                  </ReferenceDot>
                  );
                })}

                {/* Endpoint callouts */}
                {baselineEnd !== undefined && lastRow && (
                  <ReferenceDot x={lastRow.period} y={baselineEnd} r={0} fill="none" stroke="none">
                    <Label value={baselineEnd.toFixed(1)} position="right" offset={6} style={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} />
                  </ReferenceDot>
                )}
                {forecastEnd !== undefined && lastRow && chartIsAdjusted && (
                  <ReferenceDot x={lastRow.period} y={forecastEnd} r={0} fill="none" stroke="none">
                    <Label value={`${forecastEnd.toFixed(1)} (${endpointDelta > 0 ? "+" : ""}${endpointDelta.toFixed(1)})`} position="right" offset={6} style={{ fontSize: 10, fill: C.green, fontWeight: 600 }} />
                  </ReferenceDot>
                )}

                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="line"
                  wrapperStyle={{ fontSize: "10px", color: C.textMuted }}
                  formatter={(value: string) => <span style={{ color: C.textSec, fontSize: "10px" }}>{value}</span>}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Diagnostics strip */}
          <div style={{
            marginTop: "12px", padding: "10px 16px",
            background: "#f8fafc", border: `1px solid ${C.borderSub}`, borderRadius: "8px",
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px",
          }}>
            {[
              { label: "Forecast shift", value: shiftPct === 0 ? "—" : `${shiftPct > 0 ? "+" : ""}${shiftPct}%`, color: shiftPct > 0 ? C.green : shiftPct < 0 ? C.red : C.textMuted },
              { label: "Signal strength", value: chartIsAdjusted ? (Math.abs(shiftPct) > 4 ? "High" : Math.abs(shiftPct) > 1.5 ? "Medium" : "Low") : "—", color: chartIsAdjusted ? (Math.abs(shiftPct) > 4 ? C.green : C.amber) : C.textMuted },
              { label: "Volatility", value: volMetric?.value || "—", color: volMetric?.color || C.textMuted },
              { label: "Confidence", value: confMetric?.value || "—", color: C.text },
              { label: "Horizon", value: horizonMetric?.value || "—", color: C.text },
              { label: "Top driver", value: topDriverMetric?.value || "—", color: C.text },
            ].map(d => (
              <div key={d.label}>
                <p style={{ fontSize: "10px", color: C.textFaint, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.3px" }}>{d.label}</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: d.color, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — Forecast movement explained */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Movement explanation */}
          <div style={{ ...card, padding: "18px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 600, color: C.text, margin: "0 0 12px" }}>
              Forecast movement explained
            </h4>
            {activeIntel.drivers.slice(0, 4).map((dr, i) => {
              const dirLabel = dr.contribution > 0 ? "Upward" : dr.contribution < 0 ? "Downward" : "Neutral";
              const dirColor = dr.contribution > 0 ? C.green : dr.contribution < 0 ? C.red : C.textMuted;
              return (
                <div key={i} style={{
                  padding: "8px 0",
                  borderBottom: i < Math.min(activeIntel.drivers.length, 4) - 1 ? `1px solid ${C.borderSub}` : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}>{dr.name}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: dirColor }}>
                      {dr.contribution > 0 ? "+" : ""}{dr.contribution}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "3px" }}>
                    <span style={{ fontSize: "10px", color: dirColor, fontWeight: 500 }}>{dirLabel}</span>
                    <span style={{ fontSize: "10px", color: C.textFaint }}>|</span>
                    <span style={{ fontSize: "10px", color: C.textFaint }}>{confMetric?.value || "—"} conf.</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Endpoint summary card */}
          <div style={{ ...card, padding: "18px" }}>
            <h4 style={{ fontSize: "13px", fontWeight: 600, color: C.text, margin: "0 0 10px" }}>
              Endpoint summary
            </h4>
            {[
              { label: "Baseline endpoint", value: baselineEnd?.toFixed(1) || "—", color: "#94a3b8" },
              { label: "Signal-adjusted endpoint", value: forecastEnd?.toFixed(1) || "—", color: C.green },
              { label: "Delta vs baseline", value: endpointDelta === 0 ? "—" : `${endpointDelta > 0 ? "+" : ""}${endpointDelta.toFixed(1)}`, color: endpointDelta > 0 ? C.green : endpointDelta < 0 ? C.red : C.textMuted },
              { label: "Forecast shift", value: shiftPct === 0 ? "—" : `${shiftPct > 0 ? "+" : ""}${shiftPct}%`, color: shiftPct > 0 ? C.green : shiftPct < 0 ? C.red : C.textMuted },
            ].map((m, i) => (
              <div key={m.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0",
                borderBottom: i < 3 ? `1px solid ${C.borderSub}` : "none",
              }}>
                <span style={{ fontSize: "11px", color: C.textMuted }}>{m.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Mode indicator */}
          <div style={{
            padding: "10px 14px",
            background: C.greenSubtle, border: `1px solid ${C.greenBorder}`,
            borderRadius: "8px",
          }}>
            <p style={{ fontSize: "11px", color: C.green, margin: 0, fontWeight: 500 }}>
              {llmResponse ? "LLM-structured intelligence" : hasSource ? "Source-adjusted demo" : "Deterministic demo"}
            </p>
            <p style={{ fontSize: "10px", color: C.textMuted, margin: "3px 0 0" }}>
              {llmResponse ? (llmResponse.chart_guidance?.model_mode || "LLM-structured source intelligence") : hasSource ? "Source signals adjust this deterministic forecast." : "Baseline domain data. Upload sources to adjust."}
            </p>
          </div>
        </div>
      </div>
        );
      })()}
    </div>
  );
}

// ── Screen 3: Forecast Decision Pack ──────────────────────────────────────

function ForecastDecisionPack({ domain, parsedResult, csvSignals, combinedReadout, activeIntel }: { domain: DomainId; parsedResult: ParsedResult | null; csvSignals: UploadedFileSignal[]; combinedReadout: CombinedReadout | null; activeIntel: ActiveIntelligence }) {
  const b = DOMAINS[domain].brief;
  const allFeatures = activeIntel.hasSourceInput ? activeIntel.features : b.features;
  const allEvidence = activeIntel.hasSourceInput ? activeIntel.evidence : b.evidence;
  const briefOutlook = combinedReadout?.outlook || b.outlook;
  const briefConfidence = combinedReadout?.confidence || b.confidence;
  const briefOutlookText = combinedReadout?.reasoning || b.outlookText;
  const risks = activeIntel.hasSourceInput ? activeIntel.risks : b.risks;

  // ── Decision stance derivation ──
  const confNum = parseInt(briefConfidence) || 65;
  const olLower = briefOutlook.toLowerCase();
  const stance = olLower.includes("bullish") && !olLower.includes("mild")
    ? "Secure near-term coverage"
    : olLower.includes("mild") || (olLower.includes("mixed") && olLower.includes("bullish"))
    ? "Hedge upside exposure"
    : olLower.includes("bearish")
    ? "Delay purchase"
    : confNum < 55
    ? "Escalate to analyst review"
    : "Hold and monitor";
  const urgency = confNum >= 75 ? "High" : confNum >= 60 ? "Medium" : "Low";
  const urgencyColor = urgency === "High" ? C.red : urgency === "Medium" ? C.amber : C.textMuted;
  const topDriver = activeIntel.drivers[0]?.name || "Source signals";
  const outlookColor = olLower.includes("bullish") ? C.green : olLower.includes("bearish") ? C.red : C.amber;
  const dirColor = (dir: string) => dir === "Bullish" ? C.green : dir === "Bearish" ? C.red : dir === "Watch" || dir === "Mixed" ? C.amber : C.textMuted;

  // ── Volatility regime ──
  const mixedSignals = activeIntel.signals.filter(s => s.direction === "Watch" || s.direction === "Mixed" || s.direction === "Bearish");
  const volRegime = mixedSignals.length >= 3 ? "High" : mixedSignals.length >= 1 ? "Elevated" : "Low";
  const volColor = volRegime === "High" ? C.red : volRegime === "Elevated" ? C.amber : C.green;

  // ── Baseline vs signal-adjusted labels ──
  const baselineLabel = b.outlook === "Bullish" ? "Mild upward pressure"
    : b.outlook === "Mixed / Bullish" ? "Moderate mixed pressure" : "Neutral baseline";
  const adjustedLabel = activeIntel.hasSourceInput
    ? (olLower.includes("bullish") ? "Stronger upward pressure after source-derived signals" : olLower.includes("bearish") ? "Downward revision after source-derived signals" : "Modified outlook after source-derived signals")
    : "No signal adjustment — using domain baseline";

  // ── Recommendation cards (domain-aware) ──
  const recCards: { title: string; action: string; priority: string; priorityColor: string; confidence: string; why: string }[] = (() => {
    const hi = { priority: "High", priorityColor: C.red };
    const med = { priority: "Medium", priorityColor: C.amber };
    const lo = { priority: "Low", priorityColor: C.textMuted };
    const conf = briefConfidence;
    if (domain === "freight") return [
      { title: "Procurement implication", action: olLower.includes("bullish") ? "Lock rates on key lanes within 1–2 weeks" : olLower.includes("bearish") ? "Delay rate commitments — spot may soften" : "Monitor spot vs. contract spread before committing", ...hi, confidence: conf, why: `${topDriver} is driving rate pressure. Delaying may increase exposure.` },
      { title: "Hedging / rate exposure", action: olLower.includes("bullish") ? "Consider forward cover on volatile routes" : "Reduce hedge ratio — downside risk is limited", ...(olLower.includes("bullish") ? hi : med), confidence: conf, why: `Volatility regime is ${volRegime.toLowerCase()}. ${activeIntel.drivers[1]?.name || "Route demand"} adds uncertainty.` },
      { title: "Monitoring cadence", action: volRegime === "High" ? "Increase to daily monitoring" : volRegime === "Elevated" ? "Maintain weekly review cycle" : "Standard bi-weekly review sufficient", ...lo, confidence: conf, why: `${activeIntel.signals.length} active signals across ${allEvidence.length} sources. ${volRegime} volatility.` },
    ];
    if (domain === "agriculture") return [
      { title: "Procurement timing", action: olLower.includes("bullish") ? "Accelerate near-term purchases before price adjustment" : olLower.includes("bearish") ? "Defer purchases — prices may ease" : "Stagger procurement across 2–4 week windows", ...hi, confidence: conf, why: `${topDriver} is the primary price driver. Timing sensitivity is elevated.` },
      { title: "Weather / supply exposure", action: activeIntel.signals.some(s => s.name.toLowerCase().includes("weather")) ? "Monitor weather models weekly — revision risk is material" : "Supply-side risk is contained — standard monitoring", ...med, confidence: conf, why: `Weather and harvest signals affect near-term supply estimates.` },
      { title: "Inventory planning", action: olLower.includes("bullish") ? "Build safety stock — upside price risk" : "Maintain standard inventory levels", ...(olLower.includes("bullish") ? med : lo), confidence: conf, why: `Inventory cost vs. price exposure trade-off given ${volRegime.toLowerCase()} volatility.` },
    ];
    // mining (default)
    return [
      { title: "Buy / hold timing", action: olLower.includes("bullish") ? "Accelerate near-term buying before further price increase" : olLower.includes("bearish") ? "Hold — wait for price correction" : "Maintain current position — no strong directional signal", ...hi, confidence: conf, why: `${topDriver} is driving price pressure. Timing matters in current ${volRegime.toLowerCase()} volatility regime.` },
      { title: "Supply risk exposure", action: activeIntel.drivers.some(d => d.name.toLowerCase().includes("supply") || d.name.toLowerCase().includes("disruption")) ? "Diversify supplier base — disruption risk is elevated" : "Current supplier exposure is manageable", ...med, confidence: conf, why: `Supply disruption signals detected across ${allEvidence.length} sources.` },
      { title: "Price volatility", action: volRegime === "High" ? "Hedge price exposure — volatility is elevated" : volRegime === "Elevated" ? "Monitor spread — hedge if band widens" : "No immediate hedging action required", ...(volRegime === "High" ? hi : lo), confidence: conf, why: `${mixedSignals.length} mixed/bearish signals contribute to ${volRegime.toLowerCase()} volatility.` },
    ];
  })();

  // ── Ranked driver impact ──
  const rankedDrivers = activeIntel.signals.slice(0, 6).map((sig, idx) => {
    const contrib = activeIntel.drivers.find(d => d.name === sig.name);
    const impact = contrib ? `${contrib.contribution > 0 ? "+" : ""}${contrib.contribution}%` : (sig.direction === "Bullish" ? "+moderate" : sig.direction === "Bearish" ? "-moderate" : "neutral");
    const confVal = parseInt(sig.confidence) || 60;
    const evidenceCount = Math.max(1, allEvidence.filter(e => e.toLowerCase().includes(sig.name.toLowerCase().split(" ")[0])).length);
    const watchAction = sig.direction === "Bullish" ? "Monitor for reversal" : sig.direction === "Bearish" ? "Watch for easing" : "Track for directional clarity";
    return { rank: idx + 1, name: sig.name, direction: sig.direction, directionColor: sig.directionColor, impact, confidence: `${confVal}%`, evidenceCount, watchAction };
  });

  // ── Watchlist triggers (domain-aware) ──
  const triggerThreshold = confNum >= 75 ? "3%" : confNum >= 60 ? "5%" : "8%";
  const watchlistTriggers = [
    { condition: `Forecast shift exceeds ${triggerThreshold} vs. baseline`, action: "Escalate to analyst review", severity: "High" as const },
    { condition: `Confidence drops below ${Math.max(40, confNum - 15)}%`, action: "Require analyst validation before acting", severity: "High" as const },
    { condition: `Volatility regime moves to ${volRegime === "High" ? "extreme" : "high"}`, action: "Increase monitoring cadence to daily", severity: "Medium" as const },
    { condition: `${topDriver} signal reverses direction`, action: "Review stance and re-run signal analysis", severity: "High" as const },
    ...(domain === "freight" ? [{ condition: "New vessel capacity enters key lanes", action: "Re-evaluate rate exposure and hedging", severity: "Medium" as const }] : []),
    ...(domain === "agriculture" ? [{ condition: "Weather forecast materially changes", action: "Re-assess harvest estimates and procurement timing", severity: "Medium" as const }] : []),
    ...(domain === "mining" ? [{ condition: "Mine output resumes or disruption clears", action: "Reduce urgency — supply risk may ease", severity: "Medium" as const }] : []),
  ];

  // ── Risk reversal conditions ──
  const reversalConditions: string[] = (() => {
    const base = [
      `${topDriver} reverses or clears faster than expected`,
      "Source evidence becomes stale or contradictory",
    ];
    if (domain === "freight") return [...base, "Port congestion clears on major routes", "Demand weakens materially on key lanes", "Fuel cost trajectory reverses"];
    if (domain === "agriculture") return [...base, "Weather risk does not materialize", "Trade policy normalizes", "Harvest estimates are revised upward"];
    if (domain === "mining") return [...base, "Supply disruption resolves quickly", "Demand weakens below seasonal norms", "FX headwinds strengthen significantly"];
    return [...base, "Primary driver reverses", "Market sentiment shifts on new data"];
  })();

  // ── Shared section styles ──
  const sectionHead: React.CSSProperties = { fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 12px" };
  const tinyLabel: React.CSSProperties = { fontSize: "10px", color: C.textFaint, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.3px" };

  return (
    <div>

      {/* ─── 1. Recommended Decision Stance ─── */}
      <div style={{ ...card, marginBottom: "16px", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: 0 }}>
            Recommended Decision Stance
          </h3>
          <span style={{
            padding: "3px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
            background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, color: C.green,
          }}>{stance}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "14px" }}>
          {[
            { label: "Confidence", value: briefConfidence, color: C.text },
            { label: "Urgency", value: urgency, color: urgencyColor },
            { label: "Outlook", value: briefOutlook, color: outlookColor },
            { label: "Top driver", value: topDriver, color: C.text },
          ].map(m => (
            <div key={m.label}>
              <p style={tinyLabel}>{m.label}</p>
              <p style={{ fontSize: m.label === "Top driver" ? "13px" : "14px", fontWeight: 600, color: m.color, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.6 }}>
          {activeIntel.hasSourceInput
            ? `Signal-adjusted forecast shifted from baseline after applying ${activeIntel.signals.length} source-derived market signals. Primary driver: ${topDriver}. Recommended action: ${stance.toLowerCase()}.`
            : `Baseline forecast based on domain defaults. Upload sources or paste a URL to refine the signal-adjusted forecast and decision stance.`}
        </p>
      </div>

      {/* ─── 2. What Changed vs Baseline ─── */}
      <div style={{ ...card, marginBottom: "16px", padding: "20px 24px" }}>
        <h4 style={sectionHead}>What Changed vs Baseline</h4>
        <div style={{ display: "grid", gridTemplateColumns: "20% 40% 40%", gap: "0", fontSize: "12px" }}>
          {/* Header */}
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.borderSub}` }} />
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.borderSub}`, background: "rgba(148,163,184,0.06)", borderTopLeftRadius: "6px" }}>
            <span style={{ ...tinyLabel, margin: 0 }}>Baseline view</span>
          </div>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.borderSub}`, background: "rgba(22,163,74,0.05)", borderTopRightRadius: "6px" }}>
            <span style={{ ...tinyLabel, margin: 0 }}>Signal-adjusted</span>
          </div>
          {/* Rows */}
          {([
            { label: "Forecast pressure", baseline: b.outlook, adjusted: briefOutlook, adjColor: outlookColor },
            { label: "Volatility regime", baseline: "Moderate", adjusted: volRegime, adjColor: volColor },
            { label: "Top driver", baseline: DOMAINS[domain].drivers[0]?.name || "—", adjusted: topDriver, adjColor: C.text },
            { label: "Recommended stance", baseline: "Hold and monitor", adjusted: stance, adjColor: C.green },
          ] as { label: string; baseline: string; adjusted: string; adjColor: string }[]).map((row, i) => {
            const isLast = i === 3;
            const rowBorder = isLast ? "none" : `1px solid ${C.borderSub}`;
            return (
            <React.Fragment key={row.label}>
              <div style={{ padding: "9px 10px", borderBottom: rowBorder, color: C.textMuted, fontWeight: 500 }}>{row.label}</div>
              <div style={{ padding: "9px 10px", borderBottom: rowBorder, color: C.textFaint, background: "rgba(148,163,184,0.06)", borderBottomLeftRadius: isLast ? "6px" : undefined }}>{row.baseline}</div>
              <div style={{ padding: "9px 10px", borderBottom: rowBorder, color: row.adjColor, fontWeight: 500, background: "rgba(22,163,74,0.05)", borderBottomRightRadius: isLast ? "6px" : undefined }}>{row.adjusted}</div>
            </React.Fragment>
            );
          })}
        </div>
        {activeIntel.hasSourceInput && (
          <p style={{ fontSize: "11px", color: C.textMuted, margin: "12px 0 0", lineHeight: 1.5 }}>
            {adjustedLabel}
          </p>
        )}
      </div>

      {/* ─── 3. Recommendation Cards ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "16px" }}>
        {recCards.map((rc) => (
          <div key={rc.title} style={{ ...card, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: C.text, margin: 0 }}>{rc.title}</h4>
              <span style={{
                padding: "2px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: 600,
                background: rc.priorityColor === C.red ? "rgba(220,38,38,0.08)" : rc.priorityColor === C.amber ? "rgba(217,119,6,0.08)" : "#f3f4f6",
                border: `1px solid ${rc.priorityColor === C.red ? "rgba(220,38,38,0.20)" : rc.priorityColor === C.amber ? "rgba(217,119,6,0.20)" : C.border}`,
                color: rc.priorityColor,
              }}>{rc.priority}</span>
            </div>
            <p style={{ fontSize: "12px", color: C.text, margin: "0 0 10px", lineHeight: 1.55, fontWeight: 500, flex: 1 }}>{rc.action}</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: C.textFaint }}>Confidence: <strong style={{ color: C.textSec }}>{rc.confidence}</strong></span>
            </div>
            <p style={{ fontSize: "11px", color: C.textMuted, margin: 0, lineHeight: 1.5 }}>{rc.why}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 370px", gap: "16px", marginBottom: "16px" }}>
        {/* ─── Left column ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ─── 4. Ranked Driver Impact ─── */}
          <div style={card}>
            <h4 style={sectionHead}>Ranked Driver Impact</h4>
            <div style={{
              display: "grid", gridTemplateColumns: "32px 1.4fr 70px 70px 60px 50px 1fr",
              padding: "0 0 8px", borderBottom: `1px solid ${C.borderSub}`,
            }}>
              {["#", "Driver", "Direction", "Impact", "Conf.", "Src", "Watch action"].map(h => (
                <span key={h} style={{ fontSize: "10px", color: C.textFaint, fontWeight: 500, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {rankedDrivers.map((d, i) => (
              <div key={d.rank} style={{
                display: "grid", gridTemplateColumns: "32px 1.4fr 70px 70px 60px 50px 1fr",
                alignItems: "center", padding: "9px 0",
                borderBottom: i < rankedDrivers.length - 1 ? `1px solid rgba(0,0,0,0.04)` : "none",
              }}>
                <span style={{ fontSize: "12px", color: C.textFaint, fontWeight: 600 }}>{d.rank}</span>
                <span style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}>{d.name}</span>
                <span style={{ fontSize: "11px", color: d.directionColor, fontWeight: 500 }}>{d.direction}</span>
                <span style={{ fontSize: "12px", color: d.direction === "Bullish" ? C.green : d.direction === "Bearish" ? C.red : C.textSec, fontWeight: 600 }}>{d.impact}</span>
                <span style={{ fontSize: "11px", color: C.textSec }}>{d.confidence}</span>
                <span style={{ fontSize: "11px", color: C.textFaint }}>{d.evidenceCount}</span>
                <span style={{ fontSize: "11px", color: C.textMuted }}>{d.watchAction}</span>
              </div>
            ))}
          </div>

          {/* ─── 5. Decision Brief (market outlook + export) ─── */}
          <div style={card}>
            <h4 style={sectionHead}>Decision Brief</h4>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {[
                { text: `Market: ${b.market}`, green: false },
                { text: `Outlook: ${briefOutlook}`, green: true },
                { text: `Confidence: ${briefConfidence}`, green: false },
              ].map((chip) => (
                <span key={chip.text} style={{
                  padding: "4px 10px", borderRadius: "20px", fontSize: "11px",
                  background: chip.green ? C.greenSubtle : "#f3f4f6",
                  border: `1px solid ${chip.green ? C.greenBorder : C.border}`,
                  color: chip.green ? C.green : C.textSec,
                  fontWeight: chip.green ? 500 : 400,
                }}>{chip.text}</span>
              ))}
            </div>
            <div style={{
              padding: "14px", background: "rgba(22,163,74,0.05)",
              border: `1px solid rgba(22,163,74,0.14)`, borderRadius: "8px", marginBottom: "16px",
            }}>
              <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.65 }}>{briefOutlookText}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{
                padding: "9px 20px", background: C.green, color: "#fff",
                border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              }}>Export brief (demo)</button>
              <button style={{
                padding: "9px 20px", background: "transparent", color: C.textSec,
                border: `1px solid ${C.borderInput}`, borderRadius: "8px",
                fontSize: "12px", cursor: "pointer",
              }}>Share with analysts (demo)</button>
            </div>
          </div>
        </div>

        {/* ─── Right column ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ─── 6. Watchlist Triggers ─── */}
          <div style={card}>
            <h4 style={sectionHead}>Watchlist Triggers</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {watchlistTriggers.map((t, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: t.severity === "High" ? "rgba(220,38,38,0.04)" : "#fafafa",
                  border: `1px solid ${t.severity === "High" ? "rgba(220,38,38,0.12)" : C.borderSub}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{
                      fontSize: "9px", fontWeight: 600, textTransform: "uppercase",
                      color: t.severity === "High" ? C.red : C.amber,
                    }}>{t.severity}</span>
                    <span style={{ fontSize: "11px", color: C.text, fontWeight: 500 }}>{t.condition}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: C.textMuted, margin: 0 }}>{t.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 7. Risk Reversal Conditions ─── */}
          <div style={card}>
            <h4 style={sectionHead}>What Could Invalidate This View?</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {reversalConditions.map((rc, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px",
                  padding: "8px 12px", background: "#fafafa",
                  border: `1px solid ${C.borderSub}`, borderRadius: "8px",
                }}>
                  <span style={{ fontSize: "12px", color: C.amber, flexShrink: 0, marginTop: "1px" }}>!</span>
                  <span style={{ fontSize: "12px", color: C.textSec, lineHeight: 1.5 }}>{rc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 8. Forecast Pack (training signals) ─── */}
          <div style={card}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 3px" }}>Forecast Pack</h4>
            <p style={{ fontSize: "11px", color: C.textFaint, margin: "0 0 12px" }}>Training-signal-ready output</p>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 50px 65px 42px",
              paddingBottom: "7px", borderBottom: `1px solid ${C.borderSub}`,
            }}>
              {["Feature", "Value", "Direction", "Src"].map((h) => (
                <span key={h} style={{ fontSize: "10px", color: C.textFaint, fontWeight: 500, textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {allFeatures.map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2fr 50px 65px 42px",
                alignItems: "center", padding: "8px 0",
                borderBottom: i < allFeatures.length - 1 ? `1px solid rgba(0,0,0,0.04)` : "none",
              }}>
                <span style={{ fontSize: "11px", color: C.textSec, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}>{f.value}</span>
                <span style={{ fontSize: "11px", color: f.directionColor, fontWeight: 500 }}>{f.direction}</span>
                <span style={{ fontSize: "10px", color: C.textFaint }}>{f.source}</span>
              </div>
            ))}
            <button style={{
              marginTop: "12px", width: "100%", padding: "8px",
              background: "#f8fafc", color: C.textSec,
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              fontSize: "11px", fontWeight: 500, cursor: "pointer",
            }}>Export signal table (demo)</button>
          </div>

          {/* ─── 9. Source Evidence ─── */}
          <div style={card}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 10px" }}>Source Evidence</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {allEvidence.map((ev, i) => (
                <div key={i} style={{
                  padding: "9px 12px", background: "#fafafa",
                  border: `1px solid ${C.borderSub}`, borderRadius: "8px",
                  fontSize: "12px", color: C.textSec,
                }}>{ev}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "intake", label: "Signal Intake" },
  { id: "intelligence", label: "Signal Intelligence" },
  { id: "forecast", label: "Forecast Decision Pack" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("intake");
  const [domain, setDomain] = useState<DomainId>("mining");
  const [modal, setModal] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSource[]>([]);
  const [csvSignals, setCsvSignals] = useState<UploadedFileSignal[]>([]);
  const [combinedReadout, setCombinedReadout] = useState<CombinedReadout | null>(null);
  const [llmIntel, setLlmIntel] = useState<ActiveIntelligence | null>(null);
  const [llmResponse, setLlmResponse] = useState<LLMResponse | null>(null);
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedSources, setGeneratedSources] = useState<{ name: string; type: string; status: string; quality: string }[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");

  // LLM intel takes priority; fall back to deterministic
  const deterministicIntel = getActiveIntelligence(domain, parsedResult, csvSignals, combinedReadout);
  const activeIntel = llmIntel || deterministicIntel;

  // Sources changed since last generate if snapshot was cleared but a generate already completed
  const sourcesDirty = (generateStatus === "done" || generateStatus === "error") && generatedSources.length === 0 && uploadedFiles.length > 0;

  const handleSetDomain = (d: DomainId) => {
    // Preserve manual uploads across domain switch; clear only configured sync files
    const manualOnly = uploadedFiles.filter((f) => f.sourceCategory !== "Configured sync");
    setDomain(d);
    setParsedResult(null);
    setUploadedFiles(manualOnly);
    setCsvSignals(extractSignalsFromUploadedFiles(manualOnly, d));
    setCombinedReadout(null); setLlmIntel(null); setLlmResponse(null);
    setGenerateStatus("idle"); setGenerateError(null); setGeneratedSources([]);
    setSyncStatus("idle");
  };

  const handleSyncSources = async () => {
    setSyncStatus("syncing");
    try {
      const resp = await fetchSyncSources(domain);
      const synced = syncFilesToUploadedSources(resp.files);
      // Remove any previous sync files before adding new ones
      const manualOnly = uploadedFiles.filter((f) => f.sourceCategory !== "Configured sync");
      const next = [...manualOnly, ...synced];
      setUploadedFiles(next);
      setCsvSignals(extractSignalsFromUploadedFiles(next, domain));
      setGeneratedSources([]); // clear snapshot so preview rebuilds from live inputs
      setSyncStatus(synced.length > 0 ? "done" : "idle");
    } catch {
      setSyncStatus("error");
    }
  };

  const handleGenerate = async (url: string, note: string) => {
    // Guard: do not generate if source/domain mismatch exists
    const hint = detectSourceDomainHint(url, note, uploadedFiles);
    if (hint && hint !== domain) return;

    // Snapshot the sources used in this run so preview persists across tab navigation
    setGeneratedSources(buildSourcePreview(url, note, uploadedFiles));

    // Always run deterministic extraction for CSV signals
    const cs = extractSignalsFromUploadedFiles(uploadedFiles, domain);
    setCsvSignals(cs);
    setGenerateStatus("analysing");
    setGenerateError(null);
    setLlmIntel(null);
    setLlmResponse(null);

    try {
      const llm = await callLLMMarketSignals(domain, url, note, uploadedFiles, cs);
      setLlmResponse(llm);
      const mapped = mapLLMToActiveIntelligence(llm, domain);
      setLlmIntel(mapped);
      // Also set combined readout from LLM for components that use it
      setCombinedReadout({
        outlook: llm.outlook,
        outlookColor: llm.outlook.toLowerCase().includes("bullish") ? C.green : llm.outlook.toLowerCase().includes("bearish") ? C.red : C.amber,
        confidence: `${llm.confidence}%`,
        confidenceNum: llm.confidence,
        horizon: llm.horizon,
        upwardDrivers: llm.upward_drivers,
        offsets: llm.offsets,
        watchlist: llm.watchlist,
        sourceCount: uploadedFiles.length + (url ? 1 : 0) + (note ? 1 : 0),
        signalCount: llm.signals.length,
        reasoning: llm.reasoning,
      });
      setGenerateStatus("done");
      setTab("intelligence");
    } catch (err) {
      // Fallback to deterministic
      const pr = parseMarketInput(domain, url, note);
      setParsedResult(pr);
      setCombinedReadout(buildCombinedReadout(domain, pr, cs, uploadedFiles));
      setGenerateError(
        err instanceof Error ? err.message : "Intelligence service unavailable. Start the backend and confirm the API key."
      );
      setGenerateStatus("error");
      setTab("intelligence");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* App bar */}
      <header style={{
        background: "#fff", borderBottom: `1px solid ${C.border}`,
        height: "54px", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 32px",
        position: "sticky", top: 0, zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: C.green, letterSpacing: "-0.02em" }}>KIAA</span>
          <span style={{ width: "1px", height: "15px", background: "rgba(0,0,0,0.14)" }} />
          <span style={{ fontSize: "14px", color: C.textSec, fontWeight: 500 }}>Market Signal Intelligence</span>
          <span style={{ width: "1px", height: "15px", background: "rgba(0,0,0,0.14)" }} />
          <div style={{ display: "inline-flex", gap: "3px", background: C.bg, borderRadius: "8px", padding: "3px" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "6px 16px", borderRadius: "6px", border: "none",
                  fontSize: "13px", fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? "#fff" : C.textMuted,
                  background: tab === t.id ? C.green : "transparent",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "1240px", margin: "0 auto", padding: "28px 28px 60px" }}>

        {tab === "intake" && (
          <SignalIntake
            domain={domain}
            setDomain={handleSetDomain}
            onGenerate={handleGenerate}
            onAddDomain={() => setModal(true)}
            customLabel={customLabel}
            parsedResult={parsedResult}
            uploadedFiles={uploadedFiles}
            onFilesUploaded={(files, _txtContent) => {
              const next = [...uploadedFiles, ...files];
              setUploadedFiles(next);
              setCsvSignals(extractSignalsFromUploadedFiles(next, domain));
              setGeneratedSources([]); // clear snapshot so preview rebuilds from live inputs
            }}
            csvSignals={csvSignals}
            generateStatus={generateStatus}
            generateError={generateError}
            generatedSources={generatedSources}
            sourcesDirty={sourcesDirty}
            onSyncSources={handleSyncSources}
            syncStatus={syncStatus}
          />
        )}
        {tab === "intelligence" && (
          <SignalIntelligence domain={domain} onGenerate={() => setTab("forecast")} parsedResult={parsedResult} csvSignals={csvSignals} combinedReadout={combinedReadout} activeIntel={activeIntel} generateStatus={generateStatus} generateError={generateError} llmResponse={llmResponse} sourcesDirty={sourcesDirty} />
        )}
        {tab === "forecast" && <ForecastDecisionPack domain={domain} parsedResult={parsedResult} csvSignals={csvSignals} combinedReadout={combinedReadout} activeIntel={activeIntel} />}
      </main>

      {modal && <AddDomainModal onClose={() => setModal(false)} onAdd={(name) => { setCustomLabel(name); handleSetDomain("custom"); }} />}
    </div>
  );
}
