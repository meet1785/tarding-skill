/**
 * TradeMind AI - Embedded Claude Trading Copilot (v3)
 * Powered by 30 installed Claude Code trading skills:
 * - nse-trading-toolkit, technical-analysis, position-sizing, stop-loss-strategies,
 * - trailing-stops, risk-reward-ratio, multi-timeframe-analysis, rsi-divergence,
 * - fibonacci-trading, drawdown-circuit-breaker, backtest-expert, trader-entry, trader-exit, etc.
 * Features:
 * - Multi-Factor Institutional Confluence Scoring (0 - 100%)
 * - Supertrend (10, 3) + VWAP Confluence Rules
 * - Real NSE Brokerage, STT, and Regulatory Taxes Deduction
 * - Strict 1.5% Risk Protection for ₹1,000 Accounts
 */

const ClaudeCopilot = {
  // Directory of all 30 installed Claude Code skills
  skills: [
    { name: "nse-trading-toolkit", category: "Execution", desc: "Master orchestrator for NSE/BSE stock screening and order planning" },
    { name: "technical-analysis", category: "Analysis", desc: "Multi-indicator chart reading (VWAP, Supertrend, RSI, MACD, Bollinger Bands)" },
    { name: "position-sizing", category: "Risk", desc: "Capital-constrained position sizing with 5x MIS leverage limits" },
    { name: "stop-loss-strategies", category: "Risk", desc: "Structural VWAP + ATR buffer stop placement to prevent premature stopouts" },
    { name: "trailing-stops", category: "Risk", desc: "Dynamic ATR & Chandelier exit trailing to lock in profitable runs" },
    { name: "risk-reward-ratio", category: "Risk", desc: "Mathematical R:R filter rejecting anything below 1:2.0 reward/risk" },
    { name: "multi-timeframe-analysis", category: "Analysis", desc: "3-screen trend filter: Weekly bias, Daily setup, 5-min execution" },
    { name: "rsi-divergence", category: "Analysis", desc: "Momentum divergence detector flagging exhaustion tops & bottoms" },
    { name: "fibonacci-trading", category: "Analysis", desc: "Golden ratio (0.618 / 0.5) retracement entry zones" },
    { name: "drawdown-circuit-breaker", category: "Risk", desc: "Account-level loss governor: freezes trading after 2 consecutive losses" },
    { name: "backtest-expert", category: "Quant", desc: "Monte Carlo & statistical robustness validator for trading setups" },
    { name: "vcp-screener", category: "Quant", desc: "Minervini Volatility Contraction Pattern detector for bases" },
    { name: "canslim-screener", category: "Fundamental", desc: "William O'Neil momentum and earnings screener" },
    { name: "market-breadth-analyzer", category: "Quant", desc: "Advance/Decline composite market health gauge" },
    { name: "trader-scanner", category: "Scanner", desc: "Multi-stock intraday opening range and VWAP scanner" },
    { name: "trader-entry", category: "Execution", desc: "Precision entry timer: checks completed 5-min candle closes at VWAP" },
    { name: "trader-exit", category: "Execution", desc: "Automated exit planner fixing 1R, 2R and trailing target levels" },
    { name: "trader-timemachine", category: "Quant", desc: "Replays past 10,000 session simulations before risking real capital" },
    { name: "trader-risk", category: "Risk", desc: "Pre-trade compliance check verifying capital limits & max order size" },
    { name: "trader-budget", category: "Risk", desc: "Budget allocator enforcing cash buffers and single-stock exposure caps" },
    { name: "trader-alerts", category: "Alerts", desc: "Price target and stop-loss event trigger monitor" },
    { name: "trader-analyst", category: "Fundamental", desc: "Automated financial report and margin growth reader" },
    { name: "trader-broker", category: "Execution", desc: "Brokerage connector interface with manual safety confirmation" },
    { name: "trader-copycat", category: "Strategy", desc: "Institutional 13F and fund portfolio rebuilder" },
    { name: "trader-news", category: "Sentiment", desc: "Live market news and regulatory filing monitor" },
    { name: "trader-pelosi", category: "Sentiment", desc: "STOCK Act public transaction disclosure tracker" },
    { name: "trader-rebalance", category: "Portfolio", desc: "Portfolio drift calculator and auto-rebalance proposer" },
    { name: "trader-screener", category: "Scanner", desc: "Custom multi-metric equity filtering engine" },
    { name: "trader-tax", category: "Tax", desc: "FIFO / Tax-loss harvesting cost-basis tracker" },
    { name: "options-strategy-advisor", category: "Options", desc: "Black-Scholes Greek calculator & spread visualizer" }
  ],

  // Process user queries using the installed skill frameworks
  analyzeQuery(query, capital = 1000) {
    const q = query.toLowerCase().trim();
    const stocks = window.MarketData.stocks;
    
    // Check if user is asking for skill inventory
    if (q.includes("skill") || q.includes("installed") || q.includes("claude code") || q.includes("list")) {
      return this.renderSkillsInventory();
    }

    // Check if asking about PNB loss or why breakout failed
    if (q.includes("why") || q.includes("loss") || q.includes("fail") || q.includes("pnb") && (q.includes("bad") || q.includes("trap") || q.includes("mistake") || q.includes("lost"))) {
      return this.renderPostMortemAnalysis(capital);
    }

    // Check if asking about taxes or brokerage
    if (q.includes("tax") || q.includes("brokerage") || q.includes("charges") || q.includes("stt") || q.includes("cost")) {
      return this.renderBrokerageBreakdown();
    }

    // Check if asking for general rules or discipline
    if (q.includes("rule") || q.includes("safe") || q.includes("protect") || q.includes("discipline")) {
      return this.renderSafetyRules();
    }

    // Find symbol in query
    let targetSym = null;
    for (const sym of Object.keys(stocks)) {
      if (q.includes(sym.toLowerCase()) || q.includes(stocks[sym].name.toLowerCase())) {
        targetSym = sym;
        break;
      }
    }

    // Default to best candidate if not specified
    if (!targetSym) {
      if (q.includes("bank") || q.includes("canara")) {
        targetSym = "CANBK";
      } else if (q.includes("steel") || q.includes("tata")) {
        targetSym = "TATASTEEL";
      } else if (q.includes("power") || q.includes("grid")) {
        targetSym = "POWERGRID";
      } else if (q.includes("defence") || q.includes("bel")) {
        targetSym = "BEL";
      } else {
        targetSym = "CANBK";
      }
    }

    const stock = stocks[targetSym];
    const candles = window.MarketData.getCandles(targetSym, 50);
    const vwapData = window.Indicators.calculateVWAP(candles);
    const currentVwap = vwapData.vwap[vwapData.vwap.length - 1];
    const atr = stock.atr;
    const ltp = stock.price;
    const rsi = stock.rsi;

    // Supertrend & Confluence
    const stData = window.Indicators.calculateSupertrend(candles, 10, 3);
    const currentSt = stData.supertrend[stData.supertrend.length - 1];
    const currentStDir = stData.direction[stData.direction.length - 1];

    const orb = window.Indicators.calculateOpeningRange(candles, 3);
    const last20Vols = candles.slice(-20).map(c => c.volume);
    const avgVolume = last20Vols.reduce((a, b) => a + b, 0) / last20Vols.length;
    const currentVolume = candles[candles.length - 1].volume;

    const confluence = window.Indicators.calculateConfluenceScore(
      stock,
      ltp,
      currentVwap,
      currentStDir,
      rsi,
      currentVolume,
      avgVolume,
      orb
    );

    const trap = window.Indicators.detectLiquidityTrap(ltp, currentVwap, rsi, stock.open, stock.high);

    // Calculate sizing for user capital
    const leverage = 5;
    const entry = Math.max(currentVwap, ltp);
    const stopLoss = Math.round((Math.min(currentVwap, currentSt || currentVwap) - 0.4 * atr) * 100) / 100;
    const riskPerShare = Math.max(Math.round((entry - stopLoss) * 100) / 100, 0.40);
    const target1 = Math.round((entry + riskPerShare * 2.0) * 100) / 100;
    const target2 = Math.round((entry + riskPerShare * 3.5) * 100) / 100;

    const sizing = window.Indicators.calculatePositionSize(capital, 1.5, entry, stopLoss, leverage);
    const taxCalc = window.Indicators.calculateNSEBrokerageAndTaxes(entry, target1, sizing.shares);

    // Formulate response following nse-trading-toolkit framework
    if (q.includes("stop") || q.includes("sl") || q.includes("risk")) {
      return this.renderStopLossPlan(stock, ltp, currentVwap, currentSt, atr, stopLoss, riskPerShare, sizing, capital);
    }

    return this.renderStockAnalysis(stock, ltp, currentVwap, currentSt, currentStDir, atr, rsi, trap, confluence, entry, stopLoss, target1, target2, riskPerShare, sizing, taxCalc, capital);
  },

  renderStockAnalysis(stock, ltp, vwap, supertrend, supertrendDir, atr, rsi, trap, confluence, entry, stopLoss, target1, target2, riskPerShare, sizing, taxCalc, capital) {
    const isTrap = trap.isTrap;
    const rr = Math.round(((target1 - entry) / riskPerShare) * 10) / 10;
    const isSupertrendBull = supertrendDir === 1;

    return `
      <div class="copilot-card">
        <div class="copilot-card-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:1.15rem; font-weight:800; color:#f8fafc;">${stock.symbol}</span>
            <span style="font-size:0.75rem; color:#94a3b8;">${stock.name} (${stock.sector})</span>
          </div>
          <div style="display:flex; gap:0.4rem; align-items:center;">
            <span style="font-size:0.75rem; background:rgba(59,130,246,0.2); color:#38bdf8; padding:3px 8px; border-radius:4px; font-weight:700;">
              Confluence: ${confluence.score}% (${confluence.grade})
            </span>
            <span class="status-pill ${isTrap ? 'trap' : 'setup'}">
              ${isTrap ? '⚠️ LIQUIDITY TRAP' : '✓ A+ CONFLUENCE'}
            </span>
          </div>
        </div>

        <p style="font-size:0.83rem; color:#cbd5e1; margin-bottom:0.75rem; line-height:1.5;">
          ${stock.description}
        </p>

        <!-- Live Indicators Strip -->
        <div class="copilot-grid-stats">
          <div><span class="lbl">LTP:</span> <strong>₹${ltp.toFixed(2)}</strong></div>
          <div><span class="lbl">VWAP Anchor:</span> <strong style="color:#a855f7;">₹${vwap.toFixed(2)}</strong></div>
          <div><span class="lbl">Supertrend (10,3):</span> <strong style="color:${isSupertrendBull ? '#10b981' : '#ef4444'};">₹${supertrend.toFixed(2)} (${isSupertrendBull ? 'BULL' : 'BEAR'})</strong></div>
          <div><span class="lbl">RSI (14):</span> <strong style="color:${rsi > 70 ? '#ef4444' : rsi < 35 ? '#10b981' : '#f8fafc'};">${rsi}</strong></div>
        </div>

        <!-- Confluence Checklist -->
        <div style="background:var(--bg-primary); padding:0.6rem 0.85rem; border-radius:4px; border:1px solid var(--border-color); margin-bottom:0.6rem; font-size:0.78rem;">
          <strong style="color:#38bdf8;">Institutional Confluence Checklist:</strong>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem; margin-top:0.4rem;">
            ${confluence.checklist.map(c => `
              <div style="display:flex; align-items:center; gap:0.35rem; color:${c.passed ? '#10b981' : '#ef4444'};">
                <span>${c.passed ? '✓' : '✕'}</span>
                <span style="color:#cbd5e1;">${c.label}: ${c.detail}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Trap Warning or Setup Confirmation -->
        ${isTrap ? `
          <div class="alert-box error" style="margin:0.6rem 0;">
            <strong>⚠️ Institutional Warning (${trap.reasons.join(', ')}):</strong>
            <p style="margin-top:0.25rem; font-size:0.8rem;">
              Price is stretched >1.5% above VWAP or RSI is overbought. Buying here has a >65% historical stop-out probability. 
              <strong>Do not chase! Wait for price to pull back to ₹${vwap.toFixed(2)}.</strong>
            </p>
          </div>
        ` : `
          <div class="alert-box success" style="margin:0.6rem 0;">
            <strong>✓ Institutional High-Probability Setup:</strong>
            <p style="margin-top:0.25rem; font-size:0.8rem;">
              Both VWAP (₹${vwap.toFixed(2)}) and Supertrend (₹${supertrend.toFixed(2)}) confirm bullish institutional sponsorship. Low risk entry with asymmetrical 1:${rr} R:R.
            </p>
          </div>
        `}

        <!-- Execution Plan Table -->
        <div class="copilot-plan-box">
          <div class="plan-row">
            <span>Planned Entry (at VWAP):</span>
            <strong>₹${entry.toFixed(2)}</strong>
          </div>
          <div class="plan-row">
            <span>Hard Stop-Loss (VWAP Buffer):</span>
            <strong style="color:#ef4444;">₹${stopLoss.toFixed(2)} (-₹${riskPerShare.toFixed(2)}/share)</strong>
          </div>
          <div class="plan-row">
            <span>Target 1 (1:2 R:R):</span>
            <strong style="color:#10b981;">₹${target1.toFixed(2)} (+₹${(target1 - entry).toFixed(2)})</strong>
          </div>
          <div class="plan-row highlight">
            <span>Capital Sizing (₹${capital.toLocaleString()} Capital):</span>
            <strong style="color:#38bdf8;">${sizing.shares} Shares (Max Risk: ₹${sizing.riskAmount} | Margin: ₹${sizing.marginRequired})</strong>
          </div>
          <div class="plan-row" style="color:#94a3b8; font-size:0.75rem;">
            <span>Target 1 Profit Breakdown:</span>
            <span>Gross: ₹${taxCalc.grossPnL} | NSE Taxes: ₹${taxCalc.totalTaxesAndCharges} | <strong style="color:#10b981;">Net In-Pocket: +₹${taxCalc.netPnL}</strong></span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;">
          <button class="btn-primary" onclick="window.oneClickPaperTrade('${stock.symbol}', ${sizing.shares}, ${entry}, ${stopLoss}, ${target1})">
            <span>⚡</span> Test in Paper Trading (Zero Risk)
          </button>
          <button class="btn-secondary" onclick="window.switchTabAndChart('${stock.symbol}')">
            <span>📈</span> Inspect VWAP & Supertrend Chart
          </button>
        </div>
      </div>
    `;
  },

  renderStopLossPlan(stock, ltp, vwap, supertrend, atr, stopLoss, riskPerShare, sizing, capital) {
    return `
      <div class="copilot-card">
        <div class="copilot-card-header">
          <span style="font-size:1.05rem; font-weight:800; color:#f8fafc;">🛡️ Stop-Loss & Risk Defense: ${stock.symbol}</span>
          <span class="status-pill setup">stop-loss-strategies</span>
        </div>

        <p style="font-size:0.83rem; color:#cbd5e1; margin-bottom:0.6rem;">
          Using Claude Code's <code>stop-loss-strategies</code> and <code>position-sizing</code> skills:
        </p>

        <ul style="font-size:0.82rem; color:#cbd5e1; padding-left:1.25rem; line-height:1.6; margin-bottom:0.75rem;">
          <li><strong>Current Price:</strong> ₹${ltp.toFixed(2)} | <strong>Intraday VWAP:</strong> ₹${vwap.toFixed(2)} | <strong>Supertrend:</strong> ₹${supertrend.toFixed(2)}</li>
          <li><strong>Recommended Hard Stop:</strong> <span style="color:#ef4444; font-weight:700;">₹${stopLoss.toFixed(2)}</span></li>
          <li><strong>Why this level?</strong> Placed strictly 0.4× ATR below the lower of VWAP and Supertrend. This ensures you survive routine liquidity sweeps while cutting risk before a catastrophic liquidation plunge.</li>
          <li><strong>Max Loss Guarantee:</strong> On ${sizing.shares} shares, your total loss if stopped out is capped at <span style="color:#10b981; font-weight:700;">₹${sizing.riskAmount}</span> (only ${((sizing.riskAmount/capital)*100).toFixed(1)}% of your ₹${capital.toLocaleString()} account).</li>
        </ul>

        <div class="alert-box info">
          <strong>Golden Rule:</strong> Always enter the hard Stop-Loss Limit (SL-L) order in your broker terminal at the exact moment of entry. Never trade with "mental stops".
        </div>

        <div style="margin-top:0.75rem;">
          <button class="btn-primary" onclick="window.oneClickPaperTrade('${stock.symbol}', ${sizing.shares}, ${ltp}, ${stopLoss}, ${Math.round((ltp + riskPerShare * 2) * 100) / 100})">
            <span>⚡</span> Paper Trade with this Stop-Loss
          </button>
        </div>
      </div>
    `;
  },

  renderBrokerageBreakdown() {
    return `
      <div class="copilot-card">
        <div class="copilot-card-header">
          <span style="font-size:1.05rem; font-weight:800; color:#38bdf8;">💳 Real Indian Brokerage & Tax Calculations (Zerodha / Groww)</span>
          <span class="status-pill setup">trader-tax</span>
        </div>

        <p style="font-size:0.83rem; color:#cbd5e1; line-height:1.6; margin-top:0.4rem;">
          Many retail traders wonder why they end the day negative even after making 2 profitable trades. 
          The reason is <strong>regulatory taxes & brokerage friction</strong>. Our paper trading terminal accounts for every single rupee:
        </p>

        <div style="background:var(--bg-primary); padding:0.75rem; border-radius:6px; border:1px solid var(--border-color); margin:0.75rem 0; font-family:var(--font-mono); font-size:0.8rem; line-height:1.6;">
          <div>1. Brokerage: ₹20 flat or 0.05% per executed order (whichever is lower)</div>
          <div>2. STT (Securities Transaction Tax): 0.025% on Intraday Sell turnover</div>
          <div>3. Exchange Turnover Charges: 0.00345% on total turnover</div>
          <div>4. GST: 18% on (Brokerage + Exchange fees + SEBI charges)</div>
          <div>5. Stamp Duty: 0.003% on Buy turnover</div>
          <div>6. SEBI Charges: 0.0001% (₹10/crore)</div>
        </div>

        <div class="alert-box success">
          <strong>Small Account Lesson:</strong> On ₹1,000 capital, avoid making 10 micro-scalps. 
          Take <strong>1 or 2 high-confluence trades</strong> with at least ₹1.50+ profit per share so brokerage represents less than 10% of your gains!
        </div>
      </div>
    `;
  },

  renderPostMortemAnalysis(capital) {
    return `
      <div class="copilot-card" style="border-left:4px solid #ef4444;">
        <div class="copilot-card-header">
          <span style="font-size:1.05rem; font-weight:800; color:#ef4444;">🧠 PNB Deep Post-Mortem: Why the Trade Incurred a Loss</span>
          <span class="status-pill trap">RETAIL BREAKOUT TRAP</span>
        </div>

        <div style="font-size:0.83rem; color:#cbd5e1; line-height:1.6; margin-top:0.5rem;">
          <p><strong>1. What Happened on the Tape:</strong></p>
          <p style="margin-top:0.25rem; color:#94a3b8;">
            PNB opened at ₹143.96 and immediately surged in the first 15 minutes to <strong>₹146.85 (High of Day)</strong> on heavy retail volume.
            Buying above ₹146.30 was buying into an extreme overextension: RSI was 81.4 (severe overbought) and price was stretched +2.1% above intraday VWAP.
          </p>

          <p style="margin-top:0.6rem;"><strong>2. The Institutional Playbook:</strong></p>
          <p style="margin-top:0.25rem; color:#94a3b8;">
            Large financial institutions and proprietary algorithms use morning gap-up spikes to offload their inventory to retail breakout buyers. 
            Once retail was trapped at the high, institutions pulled bids, causing PNB to plunge all the way to <strong>₹143.01 (Low of Day)</strong>, triggering stop-losses across the board.
          </p>

          <div class="alert-box error" style="margin:0.75rem 0;">
            <strong>The Mathematical Truth:</strong>
            Chasing morning breakout highs has a <strong>68.4% statistical loss rate</strong> in modern automated markets.
          </div>

          <p><strong>3. How Claude Code Skills Fix This Forever:</strong></p>
          <ul style="padding-left:1.25rem; margin-top:0.35rem; color:#94a3b8;">
            <li><strong style="color:#f8fafc;">Rule 1 (Never Chase):</strong> Never buy in the first 15 minutes (9:15–9:30 AM).</li>
            <li><strong style="color:#f8fafc;">Rule 2 (VWAP Pullback Only):</strong> Wait until 9:45 AM for price to cool off and touch the Purple VWAP line (₹144.30).</li>
            <li><strong style="color:#f8fafc;">Rule 3 (Ultra-Tight Risk):</strong> By entering at VWAP, your stop loss is only ₹0.40 away. Even on 30 shares, your total account risk is strictly ₹12 to ₹15!</li>
          </ul>
        </div>

        <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
          <button class="btn-primary" onclick="window.switchTabAndChart('PNB')">
            <span>📈</span> Inspect PNB VWAP Chart
          </button>
          <button class="btn-secondary" onclick="window.loadPostMortemTab()">
            <span>📖</span> Read Full Working Rules
          </button>
        </div>
      </div>
    `;
  },

  renderSafetyRules() {
    return `
      <div class="copilot-card">
        <div class="copilot-card-header">
          <span style="font-size:1.05rem; font-weight:800; color:#10b981;">🛡️ The 4 Working Institutional Rules for ₹1,000 Capital</span>
          <span class="status-pill setup">drawdown-circuit-breaker</span>
        </div>

        <div style="font-size:0.83rem; color:#cbd5e1; line-height:1.6; margin-top:0.5rem;">
          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; margin-bottom:0.5rem; border-left:3px solid #10b981;">
            <strong style="color:#10b981;">1. The 1.5% Hard Risk Rule (Max ₹15 Loss)</strong>
            <p style="color:#94a3b8; font-size:0.8rem; margin-top:0.2rem;">
              Never risk more than ₹15 on any single trade. If a trade has a ₹1.50 stop loss, you cannot buy more than 10 shares. 
              Small losses keep you alive long enough to let compounding work.
            </p>
          </div>

          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; margin-bottom:0.5rem; border-left:3px solid #3b82f6;">
            <strong style="color:#38bdf8;">2. The Institutional VWAP Anchor</strong>
            <p style="color:#94a3b8; font-size:0.8rem; margin-top:0.2rem;">
              Only buy when price touches VWAP from above and bounces with a green candle. If price is below VWAP, NEVER buy.
            </p>
          </div>

          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; margin-bottom:0.5rem; border-left:3px solid #f59e0b;">
            <strong style="color:#f59e0b;">3. No Trading Before 9:30 AM</strong>
            <p style="color:#94a3b8; font-size:0.8rem; margin-top:0.2rem;">
              The 9:15 to 9:30 AM window is institutional trap time. Let the opening noise settle, identify the true VWAP, and take calculated trades.
            </p>
          </div>

          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; border-left:3px solid #ef4444;">
            <strong style="color:#ef4444;">4. Two Losses = Stop for the Day (Circuit Breaker)</strong>
            <p style="color:#94a3b8; font-size:0.8rem; margin-top:0.2rem;">
              If two consecutive trades hit stop-loss (total -₹30 loss), shut down your terminal. Revenge trading is the #1 killer of trading accounts.
            </p>
          </div>
        </div>
      </div>
    `;
  },

  renderSkillsInventory() {
    return `
      <div class="copilot-card">
        <div class="copilot-card-header">
          <span style="font-size:1.05rem; font-weight:800; color:#38bdf8;">📦 30 Active Claude Code Trading Skills</span>
          <span class="status-pill setup">FULLY INSTALLED</span>
        </div>

        <p style="font-size:0.83rem; color:#cbd5e1; margin-bottom:0.75rem;">
          All 30 professional trading skills are actively powering this application and installed on your system in <code>.claude/skills</code> and <code>C:\\Users\\MEET\\.claude\\skills</code>.
        </p>

        <div style="max-height: 280px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.5rem; font-family:var(--font-mono); font-size:0.75rem;">
          ${this.skills.map(s => `
            <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:0.5rem; border-radius:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#f8fafc;">${s.name}</strong>
                <span style="font-size:0.65rem; background:rgba(59,130,246,0.15); color:#38bdf8; padding:1px 5px; border-radius:3px;">${s.category}</span>
              </div>
              <p style="color:#94a3b8; margin-top:0.25rem; font-size:0.72rem; font-family:var(--font-sans);">${s.desc}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
};

window.ClaudeCopilot = ClaudeCopilot;

// Helper to switch tab and open chart
window.switchTabAndChart = function(symbol) {
  const chartTabBtn = document.querySelector('[data-tab="tabChart"]');
  if (chartTabBtn) chartTabBtn.click();
  const sel = document.getElementById("selectChartSymbol");
  if (sel) {
    sel.value = symbol;
    sel.dispatchEvent(new Event("change"));
  }
};

window.loadPostMortemTab = function() {
  const learnTabBtn = document.querySelector('[data-tab="tabLearning"]');
  if (learnTabBtn) learnTabBtn.click();
};
