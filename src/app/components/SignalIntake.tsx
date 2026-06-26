import { useState } from "react";
import { ChevronDown, Plus, Upload, X, Check } from "lucide-react";

interface Domain {
  id: string;
  label: string;
  urlPlaceholder: string;
  notePlaceholder: string;
  parsedSources: { name: string; type: string; status: string; quality: string }[];
}

const DOMAINS: Domain[] = [
  {
    id: "mining",
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
  },
  {
    id: "freight",
    label: "Freight / shipping rates",
    urlPlaceholder: "Paste freight index, shipping rate bulletin or port congestion update URL",
    notePlaceholder: "Baltic Dry Index softened this week. Port congestion on key Asia-Pacific routes continues to delay vessel turnaround.",
    parsedSources: [
      { name: "BDI rate bulletin URL", type: "Unstructured", status: "Parsed", quality: "High" },
      { name: "Port congestion.csv", type: "Structured", status: "Clean", quality: "High" },
      { name: "Route demand.xlsx", type: "Structured", status: "2 gaps fixed", quality: "Medium" },
      { name: "Fuel cost index.csv", type: "Structured", status: "Parsed", quality: "High" },
    ],
  },
  {
    id: "agriculture",
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
  },
];

interface Props {
  onGenerate: () => void;
  selectedDomain: string;
  setSelectedDomain: (id: string) => void;
  onAddDomain: () => void;
}

export function SignalIntake({ onGenerate, selectedDomain, setSelectedDomain, onAddDomain }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const domain = DOMAINS.find((d) => d.id === selectedDomain) ?? DOMAINS[0];

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
          Signal Intake Workspace
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          Collect market URLs, files and notes. Parse them into a reusable signal pipeline.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", marginTop: "24px" }}>
        {/* Left panel */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "28px",
          }}
        >
          {/* Market setup */}
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 16px 0" }}>
            Market setup
          </h3>

          <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "8px" }}>
            Market / domain
          </label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  background: "#f8fafc",
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{domain.label}</span>
                <ChevronDown size={14} style={{ color: "#6b7280" }} />
              </button>
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {DOMAINS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDomain(d.id); setDropdownOpen(false); }}
                      style={{
                        width: "100%",
                        padding: "9px 14px",
                        textAlign: "left",
                        fontSize: "13px",
                        color: d.id === selectedDomain ? "#16a34a" : "#0f172a",
                        background: d.id === selectedDomain ? "rgba(22,163,74,0.06)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {d.id === selectedDomain && <Check size={12} />}
                      <span style={{ paddingLeft: d.id === selectedDomain ? 0 : "20px" }}>{d.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onAddDomain}
              style={{
                padding: "9px 14px",
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.22)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#16a34a",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 500,
              }}
            >
              <Plus size={13} />
              Add new domain
            </button>
          </div>

          {/* URL input */}
          <div style={{ marginTop: "24px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "8px" }}>
              URL input
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={domain.urlPlaceholder}
              style={{
                width: "100%",
                padding: "9px 14px",
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* File upload */}
          <div style={{ marginTop: "24px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "8px" }}>
              Upload or select sample data
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
              style={{
                border: `1.5px dashed ${isDragging ? "#16a34a" : "rgba(0,0,0,0.14)"}`,
                borderRadius: "8px",
                padding: "32px 24px",
                textAlign: "center",
                background: isDragging ? "rgba(22,163,74,0.04)" : "#fafafa",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Upload size={18} style={{ color: "#9ca3af", marginBottom: "8px" }} />
              <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px 0" }}>
                Drop CSV / Excel / PDF / TXT files here
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                or choose prepared demo files
              </p>
            </div>
          </div>

          {/* Paste note */}
          <div style={{ marginTop: "24px" }}>
            <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "8px" }}>
              Paste market note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={domain.notePlaceholder}
              rows={4}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>
        </div>

        {/* Right panel — parsed source preview */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 14px 0" }}>
            Parsed source preview
          </h3>

          {/* Status chips */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "4px 10px",
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.22)",
                borderRadius: "20px",
                fontSize: "11px",
                color: "#16a34a",
                fontWeight: 500,
              }}
            >
              {domain.parsedSources.length} sources parsed
            </span>
            <span
              style={{
                padding: "4px 10px",
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                fontSize: "11px",
                color: "#374151",
              }}
            >
              92% readiness
            </span>
            <span
              style={{
                padding: "4px 10px",
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "20px",
                fontSize: "11px",
                color: "#374151",
              }}
            >
              3 gaps fixed
            </span>
          </div>

          {/* Source rows */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {domain.parsedSources.map((src, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  background: "#fafafa",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a", margin: 0 }}>
                    {src.name}
                  </p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                    {src.type}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "3px 8px",
                      background: "#f3f4f6",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "#374151",
                    }}
                  >
                    {src.status}
                  </span>
                  <span
                    style={{
                      padding: "3px 8px",
                      background: src.quality === "High" ? "rgba(22,163,74,0.10)" : "#f3f4f6",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: src.quality === "High" ? "#16a34a" : "#6b7280",
                      fontWeight: src.quality === "High" ? 500 : 400,
                    }}
                  >
                    {src.quality}
                  </span>
                </div>
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
            Generate market signals
          </button>
        </div>
      </div>

      {/* Click-outside overlay for dropdown */}
      {dropdownOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}
