# TradeMind AI — Live NSE Stock Recommendation & Paper Trading Terminal

> AI-driven financial research, live technical chart analysis, and real-time paper trading simulation tailored for Indian Equities (NSE/BSE) — accessible from any browser and fully deployable on GitHub Pages.

**Live Web Application:** [https://meet1785.github.io/tarding-skill/](https://meet1785.github.io/tarding-skill/)

---

## 🚀 Key Features

### 1. 🎯 AI Recommendation & Quantitative Research Engine
- **Custom Capital Sizing:** Specifically engineered for small accounts (e.g. ₹1,000, ₹5,000, ₹10,000) as well as larger portfolios.
- **Deep Technical Research:** Scans live market breadth, multi-timeframe trend alignment (EMA 9/21, SMA 50), 14-period RSI momentum & divergence, 14-period ATR volatility, and dynamic support/resistance.
- **Complete Trade Tickets:** Every recommendation provides:
  - Planned Entry Price
  - Hard ATR-buffered Stop-Loss
  - 1.5R and 2.5R Profit Targets
  - Recommended Share Quantity based on Fixed Fractional Risk rules
  - Confluence Confidence Score (0–100%)
  - AI Trade Thesis & Catalyst Explanation

### 2. 📈 Interactive Live Chart Studio
- Powered by **TradingView Lightweight Charts**.
- **Real-Time Candlestick Series** with live tick updates.
- **Technical Overlays:** EMA 9 (Cyan), EMA 21 (Orange), SMA 50, Volume Histogram, and Fibonacci Retracement Levels.
- **Visual Trade Projections:** Directly projects Entry (Blue), Stop-Loss (Red), and Profit Targets (Green) onto the chart canvas.
- **Side Technical Dossier:** Instant calculation of Golden Pocket retracements (0.382, 0.500, 0.618) and extension targets.

### 3. 💼 Real-Time Paper Trading Terminal
- **Zero-Risk Live Verification:** Test and verify AI recommendations in real-time with simulated live market volatility.
- **1-Click Execution:** Click "1-Click Paper Trade" on any recommendation card to instantly enter the position into your virtual portfolio.
- **Live Tick P&L Engine:** Real-time unrealized and realized P&L updates based on live price action.
- **Automated Stop-Loss & Target Triggers:** Automatically detects when price touches your Stop-Loss or Profit Target, closes the position, and books the profit/loss.
- **Local Persistence:** Retains your virtual account balance, open positions, and trade history across page reloads via `localStorage`.

### 4. 🧠 Learning Journal & Discipline Scorecard
- **Automated AI Trade Debriefs:** When any paper trade is closed, the system analyzes whether the technical thesis held up and provides actionable takeaways.
- **The ₹1,000 Capital Intraday Playbook:** Core risk management rules for trading small accounts on Indian exchanges (avoiding flat brokerage fee traps, respecting the 9:15–9:30 AM opening range rule, and trailing stops to breakeven).

---

## 📁 Repository Structure

```
├── index.html                   # Main single-page web application
├── css/
│   └── styles.css               # Bloomberg/TradingView-inspired dark terminal theme
├── js/
│   ├── data.js                  # NSE stock universe, live feeds & candle generator
│   ├── indicators.js            # Quantitative math (RSI, ATR, EMA, SMA, Fibonacci, Sizing)
│   ├── scanner.js               # AI Research Scanner & Recommendation engine
│   ├── chart.js                 # TradingView Lightweight Charts integration
│   ├── papertrading.js          # Paper trading portfolio engine & auto-trigger system
│   └── app.js                   # Application coordinator, ticker tape, and UI events
├── nse_server.py                # Standalone Python FastMCP server for live NSE data
├── run_live_skill_tests.py       # Verification test suite for NSE trading skills
└── .github/
    └── workflows/
        └── deploy.yml           # Automated GitHub Pages CI/CD workflow
```

---

## 💻 Local Quickstart

You can run the web application locally with any static web server:

```bash
# Python HTTP Server
python -m http.server 8080

# Or via Node.js
npx serve .
```

Open `http://localhost:8080` in your web browser.

---

## 🛠️ Standalone Python FastMCP Server (For AI Agents)

For developers using AI coding assistants (Google Antigravity, Claude Code, Cursor), the repository also includes a native Model Context Protocol (MCP) server:

```bash
# Run the MCP server
py nse_server.py

# Run the live test suite
py run_live_skill_tests.py
```

Exposes tools: `market_status`, `all_indices`, `stock_quote`, `technical_indicators`, `fibonacci_levels`, and `position_sizer_nse`.

---

## 📄 License

MIT License. Designed for educational, analytical, and research purposes.
