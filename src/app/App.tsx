import { useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceDot, Label,
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
  greenHover: "#15803d",
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

// ── Per-domain chart & Screen 2 metrics ──────────────────────────────────

const DOMAIN_CHARTS: Record<DomainId, {
  summaryMetrics: { label: string; value: string; color: string }[];
  yDomain: [number, number];
  chartData: Array<{ period: string; actual?: number; forecast?: number; lower?: number; bandWidth?: number }>;
  events: { period: string; value: number; label: string }[];
  metrics: { label: string; value: string; color: string }[];
}> = {
  mining: {
    summaryMetrics: [
      { label: "Forecast pressure", value: "Bullish", color: C.green },
      { label: "Confidence", value: "81%", color: C.text },
      { label: "Volatility risk", value: "Elevated", color: C.amber },
      { label: "Horizon", value: "2\u20134 weeks", color: C.text },
    ],
    yDomain: [94, 132],
    chartData: [
      { period: "W1 Jan", actual: 100.0 },
      { period: "W2 Jan", actual: 101.2 },
      { period: "W3 Jan", actual: 99.8 },
      { period: "W4 Jan", actual: 102.5 },
      { period: "W1 Feb", actual: 104.1 },
      { period: "W2 Feb", actual: 103.2 },
      { period: "W3 Feb", actual: 105.8 },
      { period: "W4 Feb", actual: 108.4, forecast: 108.4, lower: 108.4, bandWidth: 0 },
      { period: "W1 Mar", forecast: 110.2, lower: 106.4, bandWidth: 7.6 },
      { period: "W2 Mar", forecast: 111.8, lower: 107.4, bandWidth: 8.8 },
      { period: "W3 Mar", forecast: 113.5, lower: 108.2, bandWidth: 10.6 },
      { period: "W4 Mar", forecast: 114.2, lower: 108.4, bandWidth: 11.6 },
      { period: "W1 Apr", forecast: 115.8, lower: 109.1, bandWidth: 13.4 },
      { period: "W2 Apr", forecast: 116.4, lower: 108.8, bandWidth: 15.2 },
      { period: "W3 Apr", forecast: 117.9, lower: 109.6, bandWidth: 16.6 },
      { period: "W4 Apr", forecast: 118.5, lower: 109.2, bandWidth: 18.6 },
    ],
    events: [
      { period: "W3 Jan", value: 99.8, label: "Supply disruption parsed" },
      { period: "W2 Feb", value: 103.2, label: "Inventory signal changed" },
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
    yDomain: [90, 134],
    chartData: [
      { period: "W1 Jan", actual: 100.0 },
      { period: "W2 Jan", actual: 98.5 },
      { period: "W3 Jan", actual: 101.8 },
      { period: "W4 Jan", actual: 99.2 },
      { period: "W1 Feb", actual: 103.5 },
      { period: "W2 Feb", actual: 101.0 },
      { period: "W3 Feb", actual: 104.2 },
      { period: "W4 Feb", actual: 106.8, forecast: 106.8, lower: 106.8, bandWidth: 0 },
      { period: "W1 Mar", forecast: 108.0, lower: 103.5, bandWidth: 9.0 },
      { period: "W2 Mar", forecast: 109.5, lower: 103.8, bandWidth: 11.4 },
      { period: "W3 Mar", forecast: 110.8, lower: 103.0, bandWidth: 15.6 },
      { period: "W4 Mar", forecast: 111.2, lower: 102.5, bandWidth: 17.4 },
      { period: "W1 Apr", forecast: 112.5, lower: 102.0, bandWidth: 21.0 },
      { period: "W2 Apr", forecast: 113.0, lower: 101.2, bandWidth: 23.6 },
      { period: "W3 Apr", forecast: 114.2, lower: 101.0, bandWidth: 26.4 },
      { period: "W4 Apr", forecast: 114.8, lower: 100.5, bandWidth: 28.6 },
    ],
    events: [
      { period: "W2 Jan", value: 98.5, label: "Port congestion alert" },
      { period: "W3 Feb", value: 104.2, label: "Bunker fuel spike" },
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
    yDomain: [92, 128],
    chartData: [
      { period: "W1 Jan", actual: 100.0 },
      { period: "W2 Jan", actual: 100.8 },
      { period: "W3 Jan", actual: 99.5 },
      { period: "W4 Jan", actual: 98.2 },
      { period: "W1 Feb", actual: 99.0 },
      { period: "W2 Feb", actual: 101.5 },
      { period: "W3 Feb", actual: 103.0 },
      { period: "W4 Feb", actual: 104.5, forecast: 104.5, lower: 104.5, bandWidth: 0 },
      { period: "W1 Mar", forecast: 106.0, lower: 102.8, bandWidth: 6.4 },
      { period: "W2 Mar", forecast: 107.2, lower: 103.5, bandWidth: 7.4 },
      { period: "W3 Mar", forecast: 108.0, lower: 103.0, bandWidth: 10.0 },
      { period: "W4 Mar", forecast: 109.5, lower: 103.2, bandWidth: 12.6 },
      { period: "W1 Apr", forecast: 110.8, lower: 103.0, bandWidth: 15.6 },
      { period: "W2 Apr", forecast: 111.5, lower: 102.5, bandWidth: 18.0 },
      { period: "W3 Apr", forecast: 112.0, lower: 102.0, bandWidth: 20.0 },
      { period: "W4 Apr", forecast: 112.8, lower: 101.5, bandWidth: 22.6 },
    ],
    events: [
      { period: "W3 Jan", value: 99.5, label: "Crop weather alert parsed" },
      { period: "W2 Feb", value: 101.5, label: "Export inspection signal" },
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
    yDomain: [90, 116],
    chartData: [
      { period: "W1 Jan", actual: 100.0 },
      { period: "W2 Jan", actual: 100.2 },
      { period: "W3 Jan", actual: 99.8 },
      { period: "W4 Jan", actual: 100.1 },
      { period: "W1 Feb", actual: 100.3 },
      { period: "W2 Feb", actual: 99.9 },
      { period: "W3 Feb", actual: 100.4 },
      { period: "W4 Feb", actual: 100.5, forecast: 100.5, lower: 100.5, bandWidth: 0 },
      { period: "W1 Mar", forecast: 100.8, lower: 98.0, bandWidth: 5.6 },
      { period: "W2 Mar", forecast: 101.0, lower: 97.5, bandWidth: 7.0 },
      { period: "W3 Mar", forecast: 101.2, lower: 97.0, bandWidth: 8.4 },
      { period: "W4 Mar", forecast: 101.5, lower: 96.5, bandWidth: 10.0 },
      { period: "W1 Apr", forecast: 101.8, lower: 96.0, bandWidth: 11.6 },
      { period: "W2 Apr", forecast: 102.0, lower: 95.5, bandWidth: 13.0 },
      { period: "W3 Apr", forecast: 102.2, lower: 95.0, bandWidth: 14.4 },
      { period: "W4 Apr", forecast: 102.5, lower: 94.5, bandWidth: 16.0 },
    ],
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

function ForecastChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: "8px",
      padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      fontSize: "12px", lineHeight: 1.6,
    }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600, color: C.text }}>{label}</p>
      {payload.map((entry, i) => {
        if (entry.dataKey === "lower" || entry.dataKey === "bandWidth") return null;
        const name = entry.dataKey === "actual" ? "Actual" : "Forecast median";
        return (
          <p key={i} style={{ margin: 0, color: entry.color }}>
            {name}: {entry.value?.toFixed(1)}
          </p>
        );
      })}
    </div>
  );
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
  domain, setDomain, onGenerate, onAddDomain, customLabel,
}: {
  domain: DomainId;
  setDomain: (d: DomainId) => void;
  onGenerate: () => void;
  onAddDomain: () => void;
  customLabel: string;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const d = DOMAINS[domain];
  const domainLabel = domain === "custom" && customLabel ? customLabel : d.label;

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
          </div>

          <div style={{ marginTop: "22px" }}>
            <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "7px" }}>
              Upload or select sample data
            </label>
            <div style={{
              border: `1.5px dashed rgba(0,0,0,0.14)`, borderRadius: "8px",
              padding: "28px 20px", textAlign: "center", background: "#fafafa",
            }}>
              <p style={{ fontSize: "13px", color: C.textSec, margin: "0 0 4px" }}>
                Drop CSV / Excel / PDF / TXT files here
              </p>
              <p style={{ fontSize: "12px", color: C.textFaint, margin: 0 }}>or choose prepared demo files</p>
            </div>
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
          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "18px" }}>
            {[
              { text: `${d.parsedSources.length} sources parsed`, green: true },
              { text: "92% readiness", green: false },
              { text: "3 gaps fixed", green: false },
            ].map((chip) => (
              <span key={chip.text} style={{
                padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: chip.green ? 500 : 400,
                background: chip.green ? C.greenSubtle : "#f3f4f6",
                border: `1px solid ${chip.green ? C.greenBorder : C.border}`,
                color: chip.green ? C.green : C.textSec,
              }}>{chip.text}</span>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {d.parsedSources.map((src, i) => (
              <div key={i} style={{
                padding: "11px 13px", background: "#fafafa",
                border: `1px solid ${C.borderSub}`, borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: C.text, margin: 0 }}>{src.name}</p>
                  <p style={{ fontSize: "11px", color: C.textFaint, margin: "2px 0 0" }}>{src.type}</p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{
                    padding: "3px 8px", background: "#f3f4f6", borderRadius: "4px",
                    fontSize: "11px", color: C.textSec,
                  }}>{src.status}</span>
                  <span style={{
                    padding: "3px 8px", borderRadius: "4px", fontSize: "11px",
                    background: src.quality === "High" ? "rgba(22,163,74,0.10)" : "#f3f4f6",
                    color: src.quality === "High" ? C.green : C.textMuted,
                    fontWeight: src.quality === "High" ? 500 : 400,
                  }}>{src.quality}</span>
                </div>
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
          >Generate market signals</button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Signal Intelligence ──────────────────────────────────────────

function SignalIntelligence({ domain, onGenerate }: { domain: DomainId; onGenerate: () => void }) {
  const d = DOMAINS[domain];
  const dc = DOMAIN_CHARTS[domain];

  return (
    <div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "18px" }}>
        {dc.summaryMetrics.map((m) => (
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
            {d.signals.map((sig, i) => (
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
              {d.reasoning.headline}
            </p>
            <p style={{ fontSize: "12px", color: C.textSec, margin: 0, lineHeight: 1.6 }}>
              {d.reasoning.body}
            </p>
          </div>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 10px" }}>Top drivers</h4>
          <div style={{ flex: 1 }}>
            {d.drivers.map((dr, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < d.drivers.length - 1 ? `1px solid ${C.borderSub}` : "none",
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

      {/* Signal-Adjusted Forecast chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "18px", marginTop: "18px" }}>
        <div style={card}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 4px" }}>
            Signal-Adjusted Forecast
          </h3>
          <p style={{ fontSize: "12px", color: C.textMuted, margin: "0 0 18px" }}>
            Indexed market pressure — historical vs. signal-adjusted projection
          </p>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dc.chartData} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: C.textFaint }}
                  axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={dc.yDomain}
                  tick={{ fontSize: 11, fill: C.textFaint }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toFixed(0)}
                />
                <Tooltip content={<ForecastChartTooltip />} />

                {/* Confidence band (stacked: transparent base + colored band) */}
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
                  fill="rgba(22,163,74,0.10)"
                  activeDot={false}
                  isAnimationActive={false}
                />

                {/* Historical actual line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={C.text}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: C.text, stroke: "#fff", strokeWidth: 2 }}
                  name="Actual"
                />

                {/* Forecast median line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={C.green}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4, fill: C.green, stroke: "#fff", strokeWidth: 2 }}
                  name="Forecast median"
                />

                {/* Separator between historical and forecast */}
                <ReferenceLine
                  x="W4 Feb"
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

                {/* Event markers */}
                {dc.events.map((evt) => (
                  <ReferenceDot
                    key={evt.period}
                    x={evt.period}
                    y={evt.value}
                    r={5}
                    fill={C.amber}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    <Label
                      value={evt.label}
                      position="top"
                      offset={12}
                      style={{ fontSize: 10, fill: C.textSec, fontWeight: 500 }}
                    />
                  </ReferenceDot>
                ))}

                <Legend
                  verticalAlign="bottom"
                  height={32}
                  iconType="line"
                  wrapperStyle={{ fontSize: "11px", color: C.textMuted }}
                  formatter={(value: string) => <span style={{ color: C.textSec, fontSize: "11px" }}>{value}</span>}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right-side forecast metrics */}
        <div style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "0px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: C.text, margin: "0 0 16px" }}>
            Forecast metrics
          </h4>
          {dc.metrics.map((m, i) => (
            <div key={m.label} style={{
              padding: "10px 0",
              borderBottom: i < dc.metrics.length - 1 ? `1px solid ${C.borderSub}` : "none",
            }}>
              <p style={{ fontSize: "11px", color: C.textMuted, margin: "0 0 3px" }}>{m.label}</p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: m.color, margin: 0 }}>{m.value}</p>
            </div>
          ))}
          <div style={{
            marginTop: "14px", padding: "10px 12px",
            background: C.greenSubtle, border: `1px solid ${C.greenBorder}`,
            borderRadius: "8px",
          }}>
            <p style={{ fontSize: "11px", color: C.green, margin: 0, fontWeight: 500 }}>
              Deterministic demo mode
            </p>
            <p style={{ fontSize: "10px", color: C.textMuted, margin: "3px 0 0" }}>
              Signal-adjusted projection using hardcoded sample data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Forecast Decision Pack ──────────────────────────────────────

function ForecastDecisionPack({ domain }: { domain: DomainId }) {
  const b = DOMAINS[domain].brief;

  return (
    <div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 370px", gap: "18px" }}>
        {/* Left — decision brief */}
        <div style={card}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 14px" }}>Decision brief</h3>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
            {[
              { text: `Market: ${b.market}`, green: false },
              { text: `Outlook: ${b.outlook}`, green: true },
              { text: `Confidence: ${b.confidence}`, green: false },
            ].map((chip) => (
              <span key={chip.text} style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "12px",
                background: chip.green ? C.greenSubtle : "#f3f4f6",
                border: `1px solid ${chip.green ? C.greenBorder : C.border}`,
                color: chip.green ? C.green : C.textSec,
                fontWeight: chip.green ? 500 : 400,
              }}>{chip.text}</span>
            ))}
          </div>

          <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "9px" }}>
            Market outlook
          </label>
          <div style={{
            padding: "15px", background: "rgba(22,163,74,0.05)",
            border: `1px solid rgba(22,163,74,0.14)`, borderRadius: "8px", marginBottom: "22px",
          }}>
            <p style={{ fontSize: "13px", color: C.textSec, margin: 0, lineHeight: 1.65 }}>{b.outlookText}</p>
          </div>

          <label style={{ fontSize: "12px", color: C.textMuted, display: "block", marginBottom: "9px" }}>
            Risk watchlist
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "26px" }}>
            {b.risks.map((r, i) => (
              <div key={i} style={{
                padding: "11px 13px", background: "#fafafa",
                border: `1px solid ${C.borderSub}`, borderRadius: "8px",
                fontSize: "13px", color: C.textSec,
              }}>• {r}</div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button style={{
              padding: "10px 22px", background: C.green, color: "#fff",
              border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>Export brief</button>
            <button style={{
              padding: "10px 22px", background: "transparent", color: C.textSec,
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              fontSize: "13px", cursor: "pointer",
            }}>Share with analysts</button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Forecast pack */}
          <div style={card}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 3px" }}>Forecast pack</h3>
            <p style={{ fontSize: "12px", color: C.textFaint, margin: "0 0 16px" }}>Training-signal-ready output</p>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 55px 70px 50px",
              paddingBottom: "8px", borderBottom: `1px solid ${C.borderSub}`,
            }}>
              {["Feature", "Value", "Direction", "Source"].map((h) => (
                <span key={h} style={{ fontSize: "11px", color: C.textFaint, fontWeight: 500 }}>{h}</span>
              ))}
            </div>
            {b.features.map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 55px 70px 50px",
                alignItems: "center", padding: "9px 0",
                borderBottom: i < b.features.length - 1 ? `1px solid rgba(0,0,0,0.04)` : "none",
              }}>
                <span style={{ fontSize: "12px", color: C.textSec, fontFamily: "monospace" }}>{f.name}</span>
                <span style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}>{f.value}</span>
                <span style={{ fontSize: "12px", color: f.directionColor, fontWeight: 500 }}>{f.direction}</span>
                <span style={{ fontSize: "11px", color: C.textFaint }}>{f.source}</span>
              </div>
            ))}
            <button style={{
              marginTop: "13px", width: "100%", padding: "9px",
              background: "#f8fafc", color: C.textSec,
              border: `1px solid ${C.borderInput}`, borderRadius: "8px",
              fontSize: "12px", fontWeight: 500, cursor: "pointer",
            }}>Export signal table</button>
          </div>

          {/* Source evidence */}
          <div style={card}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text, margin: "0 0 13px" }}>Source evidence</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {b.evidence.map((ev, i) => (
                <div key={i} style={{
                  padding: "10px 13px", background: "#fafafa",
                  border: `1px solid ${C.borderSub}`, borderRadius: "8px",
                  fontSize: "13px", color: C.textSec,
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
            setDomain={setDomain}
            onGenerate={() => setTab("intelligence")}
            onAddDomain={() => setModal(true)}
            customLabel={customLabel}
          />
        )}
        {tab === "intelligence" && (
          <SignalIntelligence domain={domain} onGenerate={() => setTab("forecast")} />
        )}
        {tab === "forecast" && <ForecastDecisionPack domain={domain} />}
      </main>

      {modal && <AddDomainModal onClose={() => setModal(false)} onAdd={(name) => { setCustomLabel(name); setDomain("custom"); }} />}
    </div>
  );
}
