# KIAA Market Signal Intelligence

A reusable market intelligence platform demo built with React, Vite and Recharts. The app parses external market notes and URLs into forecast-ready signals with analyst-style decision support.

This is a **demo application** with a React frontend and an optional FastAPI backend. The backend uses an LLM (OpenAI) to produce structured market intelligence. The API key stays in `backend/.env` (never in the frontend). Only `backend/.env.example` is committed — `backend/.env` must not be committed to Git. If the backend is unavailable, the frontend falls back to deterministic keyword-based parsing.

## What the demo shows

- **Signal Intake** — select a market domain, paste a market note or URL, and generate structured signals
- **Signal Intelligence** — view generated signals, forecast reasoning, top drivers, a signal-adjusted forecast chart with confidence bands and event markers, and parsed intelligence from your input
- **Forecast Decision Pack** — analyst-ready decision brief, risk watchlist, training-signal-ready feature table and source evidence

Supported domains: Mining commodities, Freight / shipping rates, Agriculture commodities, and custom user-defined domains.

### Local file upload (Sprint 5A)

The file upload area accepts local `.txt`, `.csv`, and `.json` files:

- **TXT** — content is added to the market note field for signal generation via the existing parser
- **CSV** — headers, row/column counts, and sample rows are previewed; domain-aware signals are extracted deterministically (see below)
- **JSON** — top-level keys and source metadata are previewed

All files are read in-browser using the File API. No files leave the browser and nothing is uploaded to a server.

### CSV signal extraction (Sprint 5B)

Uploaded CSV files now generate deterministic domain-aware source signals based on file name and column headers. Extracted signals appear on all three screens (intake preview, intelligence table, and forecast decision pack).

Supported domain examples:

- **Freight** — port congestion, rate index, and fuel cost CSVs produce congestion pressure, rate direction, and bunker fuel offset signals
- **Mining** — inventory, production, shipment, smelter, and commodity CSVs produce supply/demand signals
- **Agriculture** — weather, export, stock-to-use, and crop/yield CSVs produce yield risk, demand, and seasonal signals

Signal extraction is fully deterministic with no backend, API, LLM, or scraping.

### Combined readout and chart adjustment (Sprint 5C)

Uploaded CSV signals now drive a combined market readout and a visibly signal-adjusted forecast chart:

- **Combined readout** — outlook, confidence, horizon, upward drivers, offsets, and analyst reasoning are computed from all parsed signals (note/URL + CSV)
- **Chart adjustment** — the forecast median and uncertainty band shift deterministically based on signal direction and strength scores; no live model or API is used
- **Freight upload pack** — recommended upload order: `freight_market_note.txt`, `freight_port_congestion.csv`, `freight_rate_index.csv`, `freight_fuel_costs.csv`, `source_notes.json`. Expected output: mildly bullish outlook over 2-4 weeks, with congestion and rate pressure as upward drivers and bunker fuel easing as a partial offset

All files are read locally in the browser. No files leave the browser and nothing is uploaded to a server. No backend, API, LLM, or scraping is used.

### Active intelligence state (Sprint 5C correction)

Before any input is generated, screens show default domain sample data. After clicking **Generate market signals** with a URL, note, or uploaded files, source-derived intelligence becomes the primary state across all screens:

- **Generated market signals table** — shows URL/note/CSV-derived signals instead of default domain rows
- **Top metric cards** — reflect source-derived outlook, confidence, volatility, and horizon
- **Forecast reasoning and drivers** — computed from parsed signals, not hardcoded
- **Chart** — forecast path is deterministically adjusted from source signal scores; event markers reflect parsed signals
- **Decision pack** — features, evidence, and risks all reflect source-derived intelligence

No live model, API, or scraping is used.

### Frontend-backend integration (Sprint 5E)

Clicking **Generate market signals** now calls the backend LLM endpoint. The API key stays in `backend/.env` — no secrets in the frontend.

- Frontend calls `POST http://127.0.0.1:8001/parse-market-signals` with domain, URL, note, file summaries, and CSV signals
- LLM response drives all screens: signals table, top metrics, drivers, chart, decision pack
- If the backend is unavailable, the app falls back to deterministic parsing with a clear error banner
- No toggle needed — the app simply uses the intelligence service when available

**To run the full stack:**

1. Start the backend first (see `backend/README.md` for setup)
2. Start the frontend: `pnpm dev`
3. Click Generate — the backend produces LLM-structured intelligence

## What is intentionally not included

- No database or persistence
- No frontend API keys — the OpenAI key stays in `backend/.env` only
- No live URL scraping (URLs are parsed by text only)
- No file storage — uploaded files are read in-browser and never stored
- No authentication or user accounts
- No production folder watcher or FTP sync in this demo
- No dark mode (KIAA light theme only)

## Setup

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

Open the URL shown in the terminal (typically `http://localhost:5173/`).

## Build

```bash
pnpm build
```

## Demo flow

1. Open the app on the **Signal Intake** tab.
2. Select a domain from the dropdown (e.g. Mining commodities).
3. Paste a market note into the text area (see examples below).
4. Click **Generate market signals**.
5. The app navigates to **Signal Intelligence** showing parsed signals, forecast reasoning, a signal-adjusted forecast chart and a parsed intelligence card.
6. Click **Generate forecast decision pack** to view the analyst-ready decision brief, risk watchlist, training-signal output table and source evidence.
7. Switch domains to see different data across all three screens.

## Sample test notes

### Mining commodities

```
Copper inventories fell 6% week-on-week after a mine outage and shipment delay. Smelter demand remains firm while port loading is disrupted.
```

### Freight / shipping rates

```
Asia-Europe spot rates firmed after port congestion increased and bunker fuel costs rose. Vessel availability remains tight with transit delays on key routes.
```

### Agriculture commodities

```
Rainfall deficit and drought risk are affecting crop condition. Export inspections remain strong while stock-to-use levels continue to tighten.
```

### Custom domain

Create a custom domain via "+ Add new domain", then paste:

```
Supply delay and demand increase are creating short-term price rise risk. Inventory change remains the main uncertainty.
```

## Backend intelligence service (Sprint 5D)

An optional FastAPI backend uses an LLM to produce structured market intelligence from the same inputs the frontend uses (URL text, notes, file summaries, CSV signals). The backend does not fetch URLs or scrape websites.

Quick start:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # then add OPENAI_API_KEY
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

See `backend/README.md` for full setup, endpoints, and test payloads.

## Tech stack

- React 18 + TypeScript
- Vite 6
- Recharts 2
- Tailwind CSS 4 + shadcn/ui (from Figma Make export)
- pnpm
- FastAPI + Pydantic (backend)
- OpenAI Python SDK (backend LLM provider)
