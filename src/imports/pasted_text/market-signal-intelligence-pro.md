Create a minimalist, professional web app prototype for “KIAA Market Signal Intelligence”.

Use the uploaded mock screen images as the primary visual reference:
1. Signal Intake Workspace
2. Market Signal Intelligence Workspace
3. Forecast Decision Pack

Important layout change:
Move the tab navigation from the left sidebar to the top of the main content area. Do not use a left sidebar. The top navigation should include three clear tabs:
- Signal Intake
- Signal Intelligence
- Forecast Decision Pack

Overall product concept:
KIAA Market Signal Intelligence is a reusable intelligence automation platform that collects external market signals, parses structured and unstructured sources, converts them into forecast-ready signals, and produces a decision-ready forecast pack. The app should demonstrate reuse across domains such as mining commodities, freight/shipping rates, and agriculture commodities.

Design style:
- Minimalist, clean, enterprise-grade
- Light theme only
- No dark mode
- No theme toggle
- No clutter
- Spacious layout
- Rounded cards and panels
- Subtle borders and shadows
- Professional SaaS dashboard feel
- Use the uploaded mock images as layout and content guidance, but improve spacing and polish

Use the KIAA light theme:

Colors:
- Page background: #f0f4f8
- Panel/card background: #ffffff
- Input background: #f8fafc
- Primary accent green: #16a34a
- Accent hover: #15803d
- Accent subtle background: rgba(22,163,74,0.08)
- Accent border: rgba(22,163,74,0.22)
- Primary text: #0f172a
- Secondary text: #374151
- Muted text: #6b7280
- Faint text/dividers: #9ca3af
- Borders: rgba(0,0,0,0.08)
- Subtle borders: rgba(0,0,0,0.06)
- Input borders: rgba(0,0,0,0.10)

Typography:
- Use Inter
- Root font size: 16px
- H1 around 24–26px, semi-bold or bold
- Section headings around 18px
- Card titles around 14–15px
- Body text around 13–14px
- Labels and metadata around 10–12px
- Keep typography calm and compact, not oversized

Global layout:
- Top app bar with KIAA logo/name on the left and “Market Signal Intelligence” title.
- Under the top app bar, place the top tab navigation centered or left-aligned within the content area.
- Tabs should be pill-like or segmented controls with green active state.
- Main content should sit in a max-width dashboard layout with generous margins.
- Use white cards on the pale grey-blue page background.
- Avoid dense tables where cards or compact rows are clearer.

Build three screens:

SCREEN 1: Signal Intake Workspace

Purpose:
Collect and parse external market signals.

Main elements:
- Page title: “Signal Intake Workspace”
- Subtitle: “Collect market URLs, files and notes. Parse them into a reusable signal pipeline.”
- Market/domain dropdown with options:
  - Mining commodities
  - Freight / shipping rates
  - Agriculture commodities
  - + Add new domain / market
- “+ Add new domain / market” should look like a supported platform feature, either as a dropdown option or adjacent secondary button.
- URL input field with placeholder example:
  “Paste market bulletin, commodity report, freight update or external source URL”
- File upload / sample data selector area
- Paste market note text area
- Parsed source preview panel
- Extraction status chips such as:
  - “5 sources parsed”
  - “92% readiness”
  - “3 gaps fixed”
- Primary CTA: “Generate market signals”

Keep this screen clean. Do not overload it with too many data rows.

SCREEN 2: Market Signal Intelligence Workspace

Purpose:
Convert parsed sources into market drivers, forecast pressure and confidence-backed signals.

Main elements:
- Page title: “Market Signal Intelligence Workspace”
- Subtitle: “Transform parsed sources into market drivers, forecast pressure and confidence-backed signals.”
- Summary metric cards:
  - Forecast pressure: Bullish
  - Confidence: 81%
  - Volatility risk: Elevated
  - Horizon: 2–4 weeks
- Generated market signals table or compact rows:
  - Supply disruption
  - Inventory pressure
  - Demand pressure
  - Logistics pressure
  - FX offset
  - Policy / event risk
- Each signal should show:
  - direction
  - strength
  - confidence
- Forecast reasoning panel:
  - “Moderately bullish price pressure”
  - short explanation
  - top drivers with contribution-style indicators
- Primary CTA: “Generate forecast decision pack”

This screen should make the signal-to-forecast relationship visually obvious. Avoid making it look like a generic analytics dashboard.

SCREEN 3: Forecast Decision Pack

Purpose:
Package the intelligence for business review, analyst validation and downstream systems.

Main elements:
- Page title: “Forecast Decision Pack”
- Subtitle: “Package market intelligence for business review, analyst validation and downstream systems.”
- Decision brief card:
  - Market outlook
  - Confidence
  - Top drivers
  - Risk watchlist
- Forecast pack card:
  - Training-signal-ready output
  - Feature-style rows such as:
    - supply_disruption
    - inventory_pressure
    - demand_pressure
    - logistics_pressure
    - fx_offset
  - value
  - direction
  - source
- Source evidence card:
  - Market bulletin parsed
  - Inventory file below rolling average
  - Demand proxy positive momentum
- Export buttons:
  - Export brief
  - Export signal table
  - Share with analysts

Important:
Do not make this screen overly focused on price curves. It should be a reusable forecast output pack, not a quant-only curve tool.

Interaction guidance:
- Top tabs should navigate between the three screens.
- Domain dropdown selection should subtly update labels/examples for mining, freight and agriculture, but the layout should remain the same to show platform reuse.
- “+ Add new domain / market” may open a simple modal with:
  - Domain name
  - Key drivers
  - Typical source types
  - Forecast horizon
- The modal can be visual only; no complex workflow required.

Tone:
The app should communicate:
“KIAA is not a generic co-pilot or chatbot. It is a reusable market intelligence automation platform that turns fragmented external signals into forecast-ready, decision-ready outputs.”

Do not include:
- Dark mode
- Left sidebar navigation
- Chatbot interface
- Legacy modernization messaging
- Heavy charts
- Overcrowded tables
- Consumer-style design