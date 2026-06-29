# KIAA Market Signal Intelligence — Demo Script

Estimated time: 5 minutes.

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

> "The intelligence service detected a freight / container benchmark source. The outlook is mildly bullish with medium-high confidence. You can see the generated signals — container freight benchmark, rate pressure, supply chain signal. The chart shows a signal-adjusted forecast path. On the right, the forecast metrics show the bias, confidence, uncertainty band, and top driver."

Point out:
- Top metric cards (Forecast pressure, Confidence, Volatility risk, Horizon)
- Generated market signals table
- Combined market readout card
- Signal-adjusted forecast chart
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

> "The combined outlook is mildly bullish over 2 to 4 weeks. Upward drivers are port congestion and route-rate pressure. Bunker fuel easing is a partial offset. The chart path adjusts from the combined signal score. Confidence is medium-high."

### Step 5 — Decision Pack (60 seconds)

1. Click **Generate forecast decision pack** (or click the Forecast Decision Pack tab).

2. Walk through:

> "This is the analyst-ready decision pack. It has the market outlook, risk watchlist, and a training-signal-ready feature table. Each feature has a value, direction, and source. The source evidence section shows exactly what inputs drove this intelligence. This is ready for downstream consumption — a forecast model, a risk dashboard, or an analyst report."

Point out:
- Decision brief with outlook/confidence chips
- Market outlook text
- Risk watchlist
- Training-signal-ready table with clean feature keys
- Source evidence

### Step 6 — Production context (30 seconds)

> "In production, the URL input connects to a scraper or RSS feed. The file upload connects to a watch folder, FTP drop, or data pipeline. The intelligence service runs on each new source arrival and produces structured signals automatically. The demo shows the same flow with local files and URL text interpretation."

---

## Fallback: backend unavailable

If the backend is not running or the API key is not configured:

1. The app shows an amber error banner: "Intelligence service unavailable."
2. It falls back to deterministic keyword-based parsing.
3. Say:

> "If the intelligence service is offline, the app falls back to local deterministic rules. In production you'd have the service running continuously."

The demo still works — signals are generated from keyword matching, but the output is less nuanced than LLM-structured intelligence.

---

## Safe wording reminders

- The app **interprets supplied URL text** — it does not scrape or fetch the page.
- Uploaded files are **read locally in the browser** — nothing leaves the machine.
- The API key is **backend-only** — it never appears in frontend code.
- The chart is a **deterministic projection** adjusted from source signals — it is not a live forecast model.
- In production, source inputs connect to **scraper outputs, watch folders, or data pipelines**.
