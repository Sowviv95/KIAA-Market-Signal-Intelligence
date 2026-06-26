import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function AddDomainModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [drivers, setDrivers] = useState("");
  const [sources, setSources] = useState("");
  const [horizon, setHorizon] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "32px",
          width: "480px",
          maxWidth: "calc(100vw - 40px)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>

        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0" }}>
          Add new domain / market
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 24px 0" }}>
          Configure a new market domain for signal collection and analysis.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "Domain name", value: name, set: setName, placeholder: "e.g. Energy — LNG spot rates" },
            { label: "Key drivers", value: drivers, set: setDrivers, placeholder: "e.g. supply, demand, weather, FX" },
            { label: "Typical source types", value: sources, set: setSources, placeholder: "e.g. URL, CSV, API, PDF" },
            { label: "Forecast horizon", value: horizon, set: setHorizon, placeholder: "e.g. 2–4 weeks" },
          ].map((field) => (
            <div key={field.label}>
              <label style={{ fontSize: "12px", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.placeholder}
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
                  fontFamily: "Inter, sans-serif",
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px",
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
            Add domain
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px",
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
