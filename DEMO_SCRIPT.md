# KIAA Market Signal Intelligence — Demo Script

Estimated time: 6–7 minutes.

## Before the demo

Start the backend and frontend in two terminals:

**Terminal 1 — Backend:**

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Verify: `http://127.0.0.1:8001/health` should return `{"status": "ok"}`.

**Terminal 2 — Frontend:**

```bash
pnpm dev
```

Open the URL shown (typically `http://localhost:5173/`).

Have these files ready in a folder for the upload step:

- `sample_data/freight/freight_market_note.txt`
- `sample_data/freight/freight_port_congestion.csv`
- `sample_data/freight/freight_rate_index.csv`
- `sample_data/freight/freight_fuel_costs.csv`
- `sample_data/freight/source_notes.json`

---

## Demo talk track

### Step 1 — Introduce the app (30 seconds)

> "This is KIAA Market Signal Intelligence. It takes unstructured market sources — URLs, analyst notes, CSV data feeds — and converts them into structured, forecast-ready intelligence. Think of it as a signal extraction layer that sits between raw market data and a forecasting model."

The app opens on **Signal Intake**. Point out the three tabs: Signal Intake, Signal Intelligence, Forecast Decision Pack.

### Step 2 — URL-only signal generation (60 seconds)

1. Select **Freight / shipping rates** from the domain dropdown.
2. Paste this URL into the URL input field:

```
https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry
```

3. Say:

> "I'm pasting a Drewry World Container Index URL. The app interprets the URL text to detect the source context — container freight, rate benchmark, shipping intelligence. It does not scrape the page."

4. Click **Generate market signals**.

5. The app shows "Analysing sources..." briefly, then navigates to **Signal Intelligence**.

6. Walk through the output:

> "The intelligence service detected a freight / container benchmark source. The outlook is mildly bullish with medium-high confidence. You can see the generated signals, the forecast reasoning, and the top drivers."

> "The Analyst Forecast chart shows three things: the dark line is historical actuals, the grey dashed line is the baseline forecast — what the market would look like without new signals — and the green line is the signal-adjusted forecast. The shaded band is the confidence range, widening into the forecast horizon. The timeline uses relative labels: T-minus weeks for history, Now for the forecast transition, and T-plus weeks for the forecast horizon."

> "Below the chart, the diagnostics strip shows the forecast shift vs baseline, signal strength, volatility, confidence, horizon, and top driver. On the right, the movement panel explains which drivers caused the forecast to shift and by how much."

Point out:
- Top metric cards (Forecast pressure, Confidence, Volatility risk, Horizon)
- Generated market signals table
- Combined market readout card
- Analyst Forecast chart with baseline vs signal-adjusted lines
- Phase bands (historical, signal window, forecast horizon)
- Diagnostics strip and endpoint summary
- Model mode label: "LLM-structured intelligence"

### Step 3 — Return and add files (60 seconds)

1. Click the **Signal Intake** tab to go back.

2. Say:

> "Now let's add structured data. In production, these could come from a data pipeline, a watch folder, or an FTP drop. For the demo, I'll upload local sample files."

3. The parsed source preview still shows the Drewry URL from the previous run.

4. Drag and drop (or browse) the five freight sample files into the upload area.

5. The preview updates to show the URL plus all uploaded files. An amber "Changed" chip and note appear: "Sources changed — regenerate to refresh intelligence."

6. Say:

> "The app detected the new files — port congestion, rate index, fuel costs, a market note, and source metadata. It extracted structured signals from the CSVs: congestion is bullish, rates are mixed, and bunker fuel is easing as a partial offset."

### Step 4 — Combined generation (60 seconds)

1. Click **Generate market signals** again.

2. Say:

> "Now the intelligence service processes all sources together — the URL, the note, and the CSV-derived signals."

3. On Signal Intelligence, walk through:

> "The combined outlook is mildly bullish over 2 to 4 weeks. Upward drivers are port congestion and route-rate pressure. Bunker fuel easing is a partial offset. The green signal-adjusted line now visibly diverges from the grey baseline. The diagnostics strip shows the forecast shifted by a measurable amount. Confidence is medium-high."

### Step 5 — Decision Pack (90 seconds)

1. Click **Generate forecast decision pack** (or click the Forecast Decision Pack tab).

2. Walk through the sections top to bottom:

> "This is the Decision Pack — the analyst-ready recommendation output."

> "At the top, the **Decision Stance** gives a clear recommendation: secure near-term coverage, hedge, hold and monitor, or escalate to review. It shows confidence, urgency, outlook, and the top driver."

> "**What Changed vs Baseline** compares the baseline view against the signal-adjusted view across forecast pressure, volatility, top driver, and recommended stance. The green column shows what changed after signals were applied."

> "The **Recommendation Cards** give domain-specific actions — for freight, it's procurement, hedging, and monitoring implications. Each card has a priority, confidence level, and rationale."

> "**Ranked Driver Impact** shows each driver with its direction, estimated impact, confidence, and a watch action."

> "**Watchlist Triggers** define the conditions that should escalate review — if the forecast shift exceeds a threshold, if confidence drops, if volatility rises, or if the top driver reverses."

> "**What Could Invalidate This View** lists the reversal conditions — what would make this recommendation wrong."

Point out:
- Decision Stance with stance badge
- What Changed vs Baseline comparison table
- Domain-aware recommendation cards
- Ranked driver impact table
- Watchlist triggers with severity badges
- Risk reversal conditions
- Training-signal-ready forecast pack
- Source evidence

### Step 6 — Production context (30 seconds)

> "In production, the URL input connects to a scraper or RSS feed. The file upload connects to a watch folder, FTP drop, or data pipeline. The intelligence service runs on each new source arrival and produces structured signals automatically. The Decision Pack feeds into downstream systems — risk dashboards, analyst workflows, or procurement tools. The demo shows the same flow with local files and URL text interpretation."

---

## Fallback: backend unavailable

If the backend is not running or the API key is not configured:

1. The app shows an amber error banner: "Intelligence service unavailable."
2. It falls back to deterministic keyword-based parsing.
3. Say:

> "If the intelligence service is offline, the app falls back to local deterministic rules. In production you'd have the service running continuously."

The demo still works — signals are generated from keyword matching, but the output is less nuanced than LLM-structured intelligence.

---

## Key narrative

> "KIAA ingests market signals, validates the source/domain context, compares a baseline forecast against a signal-adjusted forecast, shows the uncertainty range and source-derived events, and converts the forecast movement into a decision-ready pack with recommendations, watchlist triggers, and reversal conditions."

## Safe wording reminders

- The app **interprets supplied URL text** — it does not scrape or fetch the page.
- Uploaded files are **read locally in the browser** — nothing leaves the machine.
- The API key is **backend-only** — it never appears in frontend code.
- The chart is a **deterministic projection** adjusted from source-derived signals — it is not a live forecast model.
- The timeline uses **relative labels** (T-7w to T+8w) — no fake calendar dates.
- Recommendations are **decision support**, not guaranteed outcomes.
- In production, source inputs connect to **scraper outputs, watch folders, or data pipelines**.
