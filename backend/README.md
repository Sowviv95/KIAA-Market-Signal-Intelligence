# KIAA Market Signal Intelligence — Backend

Minimal FastAPI backend that uses an LLM to convert URL text, pasted notes, uploaded file summaries, and CSV-derived signals into structured market intelligence.

No real scraping, no URL fetching, no database, no auth. The LLM interprets supplied text only.

## Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## Environment

Copy the example and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o-mini
```

Do not commit `.env` to Git.

## Run

From the repository root:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend
```

Or from inside `backend/`:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

### GET /health

```bash
curl http://127.0.0.1:8000/health
```

Returns:

```json
{"status": "ok", "service": "kiaa-market-signal-intelligence-backend"}
```

### POST /parse-market-signals

Returns LLM-structured market intelligence.

If `OPENAI_API_KEY` is not set, returns:

```json
{"detail": "LLM service is not configured. Set OPENAI_API_KEY in backend environment."}
```

## Test payloads

### Drewry URL (freight)

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/parse-market-signals -Method POST `
  -ContentType "application/json" `
  -Body '{"selected_domain":"freight","url":"https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry","note":"","uploaded_files":[],"csv_signals":[]}'
```

```bash
curl -X POST http://127.0.0.1:8000/parse-market-signals \
  -H "Content-Type: application/json" \
  -d '{"selected_domain":"freight","url":"https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry","note":"","uploaded_files":[],"csv_signals":[]}'
```

### Freight upload pack summary

```bash
curl -X POST http://127.0.0.1:8000/parse-market-signals \
  -H "Content-Type: application/json" \
  -d '{
    "selected_domain": "freight",
    "url": "",
    "note": "Baltic Dry Index softened this week but remains elevated. Port congestion on Asia-Pacific routes delays vessel turnaround by 2-4 days. Bunker fuel costs eased modestly.",
    "uploaded_files": [
      {"name":"freight_port_congestion.csv","extension":"csv","detected_domain":"freight","source_category":"Structured data source","row_count":10,"column_count":6,"columns":["port","region","congestion_pct","waiting_days","queue_size","week"],"preview":"Shanghai | Asia-Pacific | 82 | 4.6 | 36 | W2 Feb"},
      {"name":"freight_rate_index.csv","extension":"csv","detected_domain":"freight","source_category":"Structured data source","row_count":9,"column_count":5,"columns":["route","week","rate_index","yoy_pct","wow_pct"],"preview":"Asia-Europe | W3 Feb | 2780 | 10.9 | -1.1"},
      {"name":"freight_fuel_costs.csv","extension":"csv","detected_domain":"freight","source_category":"Structured data source","row_count":9,"column_count":5,"columns":["hub","fuel_type","price_usd","week","change_pct"],"preview":"Singapore | VLSFO | 569 | W3 Feb | -0.9"}
    ],
    "csv_signals": [
      {"fileName":"freight_port_congestion.csv","domain":"freight","sourceCategory":"Structured data source","signal":"Asia-Pacific port congestion remains elevated","direction":"Bullish","strength":"High","confidence":82,"evidence":"Region: Asia-Pacific; Latest congestion/waiting value: 55","forecastUse":"Route-rate upward pressure / capacity absorption"},
      {"fileName":"freight_rate_index.csv","domain":"freight","sourceCategory":"Structured data source","signal":"Freight rate pressure is mixed but still elevated versus prior period","direction":"Mixed","strength":"Medium","confidence":74,"evidence":"Latest rate/index: 1640; YoY: 13.8; WoW: -1.2","forecastUse":"Near-term rate direction feature"},
      {"fileName":"freight_fuel_costs.csv","domain":"freight","sourceCategory":"Structured data source","signal":"Bunker fuel easing provides a partial cost-pressure offset","direction":"Bearish","strength":"Medium","confidence":72,"evidence":"Hub: Fujairah; Latest fuel cost: $566; Change: -0.7%","forecastUse":"Cost-pressure offset"}
    ]
  }'
```
