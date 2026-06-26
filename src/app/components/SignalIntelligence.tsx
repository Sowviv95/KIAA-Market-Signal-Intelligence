interface Props {
  onGenerate: () => void;
  domain: string;
}

type Signal = { name: string; direction: string; directionColor: string; strength: number; confidence: string };

const DOMAIN_SIGNALS: Record<string, Signal[]> = {
  mining: [
    { name: "Supply disruption", direction: "Bullish", directionColor: "#16a34a", strength: 84, confidence: "84%" },
    { name: "Inventory pressure", direction: "Bullish", directionColor: "#16a34a", strength: 88, confidence: "88%" },
    { name: "Demand pressure", direction: "Bullish", directionColor: "#16a34a", strength: 76, confidence: "76%" },
    { name: "Logistics pressure", direction: "Bullish", directionColor: "#16a34a", strength: 72, confidence: "72%" },
    { name: "FX offset", direction: "Bearish", directionColor: "#dc2626", strength: 35, confidence: "65%" },
    { name: "Policy / event risk", direction: "Watch", directionColor: "#d97706", strength: 45, confidence: "69%" },
  ],
  freight: [
    { name: "Route demand", direction: "Bullish", directionColor: "#16a34a", strength: 79, confidence: "79%" },
    { name: "Port congestion", direction: "Bullish", directionColor: "#16a34a", strength: 82, confidence: "82%" },
    { name: "Fuel cost pressure", direction: "Bearish", directionColor: "#dc2626", strength: 40, confidence: "70%" },
    { name: "Vessel availability", direction: "Bullish", directionColor: "#16a34a", strength: 68, confidence: "68%" },
    { name: "FX offset", direction: "Watch", directionColor: "#d97706", strength: 42, confidence: "62%" },
    { name: "Regulatory risk", direction: "Watch", directionColor: "#d97706", strength: 38, confidence: "60%" },
  ],
  agriculture: [
    { name: "Harvest volume", direction: "Bearish", directionColor: "#dc2626", strength: 75, confidence: "75%" },
    { name: "Export demand", direction: "Bullish", directionColor: "#16a34a", strength: 80, confidence: "80%" },
    { name: "Weather risk", direction: "Watch", directionColor: "#d97706", strength: 55, confidence: "65%" },
    { name: "Input cost pressure", direction: "Bearish", directionColor: "#dc2626", strength: 48, confidence: "68%" },
    { name: "Policy / trade risk", direction: "Watch", directionColor: "#d97706", strength: 44, confidence: "63%" },
    { name: "FX offset", direction: "Bearish", directionColor: "#dc2626", strength: 35, confidence: "60%" },
  ],
};


const DOMAIN_DRIVERS: Record<string, { name: string; contribution: number }[]> = {
  mining: [
    { name: "Supply disruption", contribution: 32 },
    { name: "Inventory tightness", contribution: 27 },
    { name: "Demand recovery", contribution: 18 },
    { name: "FX offset", contribution: -9 },
  ],
  freight: [
    { name: "Port congestion", contribution: 30 },
    { name: "Route demand growth", contribution: 24 },
    { name: "Vessel shortage", contribution: 20 },
    { name: "Fuel headwinds", contribution: -12 },
  ],
  agriculture: [
    { name: "Export demand", contribution: 28 },
    { name: "Harvest shortfall", contribution: 22 },
    { name: "Trade tariff risk", contribution: 14 },
    { name: "FX headwind", contribution: -10 },
  ],
};

const DOMAIN_REASONING: Record<string, { headline: string; body: string }> = {
  mining: {
    headline: "Moderately bullish price pressure",
    body: "The latest market view is driven by supply disruption signals, tight inventory and rising demand pressure. FX movement partially offsets the signal, but not enough to move the outlook neutral.",
  },
  freight: {
    headline: "Moderately bullish rate pressure",
    body: "Port congestion and rising route demand point to bullish rate pressure. Fuel cost headwinds partially offset upward pressure. Overall direction remains bullish with elevated volatility.",
  },
  agriculture: {
    headline: "Mixed outlook with upward skew",
    body: "Strong export demand supports prices despite harvest shortfall risk. Weather uncertainty and trade policy risk add volatility. Net signal skews bullish but confidence is moderate.",
  },
};

export function SignalIntelligence({ onGenerate, domain }: Props) {
  const signals = DOMAIN_SIGNALS[domain] ?? DOMAIN_SIGNALS.mining;
  const drivers = DOMAIN_DRIVERS[domain] ?? DOMAIN_DRIVERS.mining;
  const reasoning = DOMAIN_REASONING[domain] ?? DOMAIN_REASONING.mining;

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
          Market Signal Intelligence Workspace
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          Transform parsed sources into market drivers, forecast pressure and confidence-backed signals.
        </p>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "24px" }}>
        {[
          { label: "Forecast pressure", value: "Bullish", color: "#16a34a" },
          { label: "Confidence", value: "81%", color: "#0f172a" },
          { label: "Volatility risk", value: "Elevated", color: "#d97706" },
          { label: "Horizon", value: "2–4 weeks", color: "#0f172a" },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "10px",
              padding: "20px 22px",
            }}
          >
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 6px 0" }}>{metric.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: metric.color, margin: 0 }}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", marginTop: "20px" }}>
        {/* Signals table */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 20px 0" }}>
            Generated market signals
          </h3>

          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 1fr 80px",
              padding: "0 14px 10px 14px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {["Signal", "Direction", "Strength", "Confidence"].map((h) => (
              <span key={h} style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>
                {h}
              </span>
            ))}
          </div>

          {/* Signal rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
            {signals.map((sig, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 1fr 80px",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: i % 2 === 0 ? "#fafafa" : "transparent",
                }}
              >
                <span style={{ fontSize: "13px", color: "#0f172a" }}>{sig.name}</span>
                <span style={{ fontSize: "13px", color: sig.directionColor, fontWeight: 500 }}>
                  {sig.direction}
                </span>
                <div style={{ paddingRight: "16px" }}>
                  <div
                    style={{
                      height: "6px",
                      background: "#e5e7eb",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${sig.strength}%`,
                        background: sig.directionColor,
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: "13px", color: "#374151" }}>{sig.confidence}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast reasoning */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 16px 0" }}>
            Forecast reasoning
          </h3>

          {/* Reasoning box */}
          <div
            style={{
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.18)",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a", margin: "0 0 8px 0" }}>
              {reasoning.headline}
            </p>
            <p style={{ fontSize: "12px", color: "#374151", margin: 0, lineHeight: 1.6 }}>
              {reasoning.body}
            </p>
          </div>

          {/* Top drivers */}
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 12px 0" }}>
            Top drivers
          </h4>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0" }}>
            {drivers.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < drivers.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <span style={{ fontSize: "13px", color: "#374151" }}>{d.name}</span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: d.contribution > 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {d.contribution > 0 ? `+${d.contribution}` : d.contribution}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onGenerate}
            style={{
              marginTop: "20px",
              width: "100%",
              padding: "12px",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#15803d")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#16a34a")}
          >
            Generate forecast decision pack
          </button>
        </div>
      </div>
    </div>
  );
}
