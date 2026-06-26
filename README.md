# KIAA Market Signal Intelligence

A reusable market intelligence platform demo built with React, Vite and Recharts. The app parses external market notes and URLs into forecast-ready signals with analyst-style decision support.

This is a **frontend-only deterministic demo**. There is no backend, no API keys, no live scraping, no LLM calls and no ML model. All intelligence is generated from hardcoded keyword rules and sample data.

## What the demo shows

- **Signal Intake** — select a market domain, paste a market note or URL, and generate structured signals
- **Signal Intelligence** — view generated signals, forecast reasoning, top drivers, a signal-adjusted forecast chart with confidence bands and event markers, and parsed intelligence from your input
- **Forecast Decision Pack** — analyst-ready decision brief, risk watchlist, training-signal-ready feature table and source evidence

Supported domains: Mining commodities, Freight / shipping rates, Agriculture commodities, and custom user-defined domains.

## What is intentionally not included

- No backend or server
- No database or persistence
- No API keys or `.env` configuration
- No live URL scraping (URLs are parsed by text only)
- No LLM, ML model or real-time data
- No authentication or user accounts
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

## Tech stack

- React 18 + TypeScript
- Vite 6
- Recharts 2
- Tailwind CSS 4 + shadcn/ui (from Figma Make export)
- pnpm
