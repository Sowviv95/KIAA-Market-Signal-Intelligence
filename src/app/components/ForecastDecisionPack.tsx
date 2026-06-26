interface Props {
  domain: string;
}

const DOMAIN_DATA: Record<string, {
  market: string;
  outlook: string;
  confidence: string;
  marketOutlookText: string;
  riskWatchlist: string[];
  features: { name: string; value: number; direction: string; directionColor: string; source: string }[];
  evidence: string[];
}> = {
  mining: {
    market: "Mining commodities",
    outlook: "Bullish",
    confidence: "81%",
    marketOutlookText:
      "Price pressure is moderately bullish over the next 2–4 weeks. Supply disruption, low inventory and stronger demand signals are directionally aligned. FX pressure remains the main offset.",
    riskWatchlist: [
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
  freight: {
    market: "Freight / shipping rates",
    outlook: "Bullish",
    confidence: "76%",
    marketOutlookText:
      "Rate pressure is moderately bullish over the next 1–3 weeks. Port congestion and rising route demand are the key drivers. Fuel cost headwinds provide a partial offset.",
    riskWatchlist: [
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
  agriculture: {
    market: "Agriculture commodities",
    outlook: "Mixed / Bullish",
    confidence: "68%",
    marketOutlookText:
      "Price outlook is mixed with an upward skew over the next 3–6 weeks. Strong export demand offsets harvest shortfall risk. Weather and trade policy uncertainty keep confidence moderate.",
    riskWatchlist: [
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
};

export function ForecastDecisionPack({ domain }: Props) {
  const data = DOMAIN_DATA[domain] ?? DOMAIN_DATA.mining;

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
          Forecast Decision Pack
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          Package market intelligence for business review, analyst validation and downstream systems.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", marginTop: "24px" }}>
        {/* Left — Decision brief */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "12px",
            padding: "28px",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 16px 0" }}>
            Decision brief
          </h3>

          {/* Badges */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
            <span
              style={{
                padding: "5px 12px",
                background: "#f3f4f6",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#374151",
              }}
            >
              Market: {data.market}
            </span>
            <span
              style={{
                padding: "5px 12px",
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.22)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#16a34a",
                fontWeight: 500,
              }}
            >
              Outlook: {data.outlook}
            </span>
            <span
              style={{
                padding: "5px 12px",
                background: "#f3f4f6",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#374151",
              }}
            >
              Confidence: {data.confidence}
            </span>
          </div>

          {/* Market outlook */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "10px" }}>
              Market outlook
            </label>
            <div
              style={{
                padding: "16px",
                background: "rgba(22,163,74,0.05)",
                border: "1px solid rgba(22,163,74,0.14)",
                borderRadius: "8px",
              }}
            >
              <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: 1.65 }}>
                {data.marketOutlookText}
              </p>
            </div>
          </div>

          {/* Risk watchlist */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "10px" }}>
              Risk watchlist
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.riskWatchlist.map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: "11px 14px",
                    background: "#fafafa",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#374151",
                  }}
                >
                  • {risk}
                </div>
              ))}
            </div>
          </div>

          {/* Export buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{
                padding: "10px 20px",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#15803d")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#16a34a")}
            >
              Export brief
            </button>
            <button
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#374151",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Share with analysts
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Forecast pack */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px 0" }}>
              Forecast pack
            </h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 18px 0" }}>
              Training-signal-ready output
            </p>

            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 70px 50px",
                padding: "0 0 8px 0",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {["Feature", "Value", "Direction", "Source"].map((h) => (
                <span key={h} style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500 }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Feature rows */}
            {data.features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 70px 50px",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < data.features.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}
              >
                <span style={{ fontSize: "12px", color: "#374151", fontFamily: "monospace" }}>{f.name}</span>
                <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: 500 }}>{f.value}</span>
                <span style={{ fontSize: "12px", color: f.directionColor, fontWeight: 500 }}>{f.direction}</span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>{f.source}</span>
              </div>
            ))}

            {/* Export signal table button */}
            <button
              style={{
                marginTop: "14px",
                width: "100%",
                padding: "9px",
                background: "#f8fafc",
                color: "#374151",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
            >
              Export signal table
            </button>
          </div>

          {/* Source evidence */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 14px 0" }}>
              Source evidence
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.evidence.map((ev, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 14px",
                    background: "#fafafa",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#374151",
                  }}
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
