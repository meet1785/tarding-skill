/**
 * TradeMind AI - Main Application Controller (v3 with Supertrend & Confluence Engine)
 * Handles user interactions, tab switching, recommendations rendering, backtesting, and toast alerts.
 */

document.addEventListener("DOMContentLoaded", () => {
  window.MarketData.startLiveFeed();
  window.chartStudio = new window.ChartStudio("chartContainer");
  window.paperEngine = new window.PaperTradingEngine();

  populateTickerTape();
  setupTabs();
  setupScanner();
  setupChartControls();
  setupPaperTradingForm();
  setupBacktester();
  setupCopilot();

  runScan();

  setTimeout(() => {
    window.chartStudio.init();
    window.paperEngine.render();
    runBacktestUI();
  }, 100);
});

// Subtle audio chime for verified setups
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// Toast notification helper
window.showToast = function(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Populate Ticker Tape
function populateTickerTape() {
  const tickerWrap = document.getElementById("tickerMove");
  if (!tickerWrap) return;

  const items = [];

  window.MarketData.indices.forEach(idx => {
    const isUp = idx.pChange >= 0;
    items.push(`
      <div class="ticker-item ${isUp ? 'up' : 'down'}">
        <span class="sym">${idx.symbol}</span>
        <span class="price">${idx.price.toFixed(2)}</span>
        <span class="chg">${isUp ? '+' : ''}${idx.pChange}%</span>
      </div>
    `);
  });

  Object.values(window.MarketData.stocks).forEach(st => {
    const chg = Math.round((st.price - st.prevClose) * 100) / 100;
    const pChg = Math.round((chg / st.prevClose) * 10000) / 100;
    const isUp = pChg >= 0;
    items.push(`
      <div class="ticker-item ${isUp ? 'up' : 'down'}" id="ticker-${st.symbol}">
        <span class="sym">${st.symbol}</span>
        <span class="price">₹${st.price.toFixed(2)}</span>
        <span class="chg">${isUp ? '+' : ''}${pChg}%</span>
      </div>
    `);
  });

  tickerWrap.innerHTML = items.join("") + items.join("");

  window.MarketData.subscribe((sym, quote) => {
    const el = document.getElementById(`ticker-${sym}`);
    if (el) {
      const isUp = quote.pChange >= 0;
      el.className = `ticker-item ${isUp ? 'up' : 'down'}`;
      el.querySelector(".price").innerText = "₹" + quote.price.toFixed(2);
      el.querySelector(".chg").innerText = (isUp ? "+" : "") + quote.pChange + "%";
    }
  });
}

// Tab Switching
function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
      });

      const activePane = document.getElementById(target);
      if (activePane) {
        activePane.classList.add("active");

        if (target === "tabChart" && window.chartStudio) {
          setTimeout(() => {
            if (window.chartStudio.chart) {
              window.chartStudio.chart.applyOptions({
                width: window.chartStudio.container.clientWidth,
                height: window.chartStudio.container.clientHeight || 480
              });
            }
          }, 50);
        }

        if (target === "tabPaper" && window.paperEngine) {
          window.paperEngine.render();
        }

        if (target === "tabBacktest") {
          runBacktestUI();
        }
      }
    });
  });
}

// Scanner Controls
function setupScanner() {
  const btnRun = document.getElementById("btnRunScan");
  if (btnRun) {
    btnRun.addEventListener("click", () => {
      runScan();
    });
  }

  document.querySelectorAll(".preset-cap-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cap = btn.getAttribute("data-cap");
      const input = document.getElementById("inputCapital");
      if (input) {
        input.value = cap;
        runScan();
      }
    });
  });
}

async function runScan() {
  const btn = document.getElementById("btnRunScan");
  if (btn) btn.disabled = true;

  const capital = parseFloat(document.getElementById("inputCapital")?.value || 1000);
  const leverage = parseInt(document.getElementById("selectLeverage")?.value || 5);
  const riskPct = parseFloat(document.getElementById("selectRisk")?.value || 1.5);
  const sector = document.getElementById("selectSector")?.value || "all";

  const badgeCap = document.getElementById("badgeHeaderCapital");
  if (badgeCap) badgeCap.innerText = "₹" + capital.toLocaleString();

  const progressCard = document.getElementById("researchStatusCard");
  const progressFill = document.getElementById("researchProgressFill");
  const progressText = document.getElementById("researchProgressText");

  if (progressCard) progressCard.classList.add("active");

  const results = await window.ResearchScanner.runResearch(
    { capital, leverage, riskPct, sector },
    (msg, pct) => {
      if (progressText) progressText.innerText = msg;
      if (progressFill) progressFill.style.width = pct + "%";
    }
  );

  setTimeout(() => {
    if (progressCard) progressCard.classList.remove("active");
    if (btn) btn.disabled = false;
    renderRecommendations(results, capital, leverage);

    const hasAplus = results.some(r => r.confluenceScore >= 85);
    if (hasAplus) playNotificationChime();
  }, 350);
}

function renderRecommendations(recommendations, capital, leverage) {
  const grid = document.getElementById("recommendationsGrid");
  if (!grid) return;

  if (recommendations.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:3rem; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
        <h3>No candidates match this capital & filter criteria.</h3>
        <p style="color:#94a3b8; margin-top:0.5rem;">Try increasing capital, switching to 5x MIS leverage, or selecting 'All Sectors'.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = recommendations.map((rec, index) => {
    const isTop = index === 0 && !rec.tradeRating.includes("TRAP");
    const isTrap = rec.tradeRating.includes("TRAP");
    const isUp = rec.stock.pChange >= 0;

    return `
      <div class="trade-card ${isTop ? 'top-pick' : ''} ${isTrap ? 'trap-warning' : ''}" style="${isTrap ? 'border-color: #ef4444; background: rgba(239, 68, 68, 0.04);' : ''}">
        <div class="trade-card-header">
          <div class="sym-name-group">
            <div class="sym-title">
              ${rec.symbol}
              ${isTop ? '<span class="sym-badge" style="background:#2563eb; color:#fff; font-weight:700;">⭐ A+ CONFLUENCE PICK</span>' : ''}
              ${isTrap ? '<span class="sym-badge" style="background:#ef4444; color:#fff; font-weight:700;">⚠️ LIQUIDITY TRAP</span>' : ''}
            </div>
            <div class="sym-sector">${rec.name} • ${rec.sector}</div>
          </div>
          <div class="price-group">
            <div class="current-price" id="card-price-${rec.symbol}">₹${rec.price.toFixed(2)}</div>
            <div class="price-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${rec.stock.pChange}%</div>
          </div>
        </div>

        <div class="trade-card-body">
          <div class="score-pill-container" style="${isTrap ? 'border-color: rgba(239, 68, 68, 0.4);' : ''}">
            <span class="score-label">${isTrap ? 'Risk Assessment' : 'Institutional Confluence'}</span>
            <span class="score-val" style="color:${isTrap ? '#ef4444' : '#06b6d4'};">
              ${rec.tradeRating} (${rec.confluenceScore}%)
            </span>
          </div>

          <div class="thesis-box" style="${isTrap ? 'border-left-color: #ef4444; background: rgba(239, 68, 68, 0.08); color: #fca5a5;' : ''}">
            <strong>Strategy:</strong> ${rec.setupType}<br>
            ${rec.thesis}
          </div>

          <div class="ticket-grid">
            <div class="ticket-row">
              <span class="ticket-label">${isTrap ? 'PULLBACK BUY ZONE' : 'VWAP VALUE ENTRY'}</span>
              <span class="ticket-value entry">₹${rec.entry.toFixed(2)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">TIGHT STOP-LOSS</span>
              <span class="ticket-value sl">₹${rec.stopLoss.toFixed(2)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">TARGET 1 (1:2 R:R)</span>
              <span class="ticket-value tgt">₹${rec.target1.toFixed(2)} <small>(+₹${rec.profitT1})</small></span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">TARGET 2 (RUNNER)</span>
              <span class="ticket-value tgt">₹${rec.target2.toFixed(2)} <small>(+₹${rec.profitT2})</small></span>
            </div>
          </div>

          <!-- Multi-Timeframe Confluence Matrix -->
          ${rec.mtfMatrix ? `
          <div style="margin: 0.65rem 0; padding: 0.5rem 0.65rem; background: rgba(15, 23, 42, 0.65); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.72rem;">
              <span style="color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Multi-Timeframe Alignment</span>
              <span style="font-weight: 700; color: ${rec.mtfMatrix.bullishCount >= 3 ? '#10b981' : (rec.mtfMatrix.bullishCount === 2 ? '#f59e0b' : '#ef4444')}; font-size: 0.75rem;">
                ${rec.mtfMatrix.bullishCount}/4 Bullish (${rec.mtfMatrix.confluenceStatus.replace(/_/g, ' ')})
              </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.68rem; text-align: center; font-family: var(--font-mono);">
              <div style="padding: 2px 4px; border-radius: 4px; background: ${rec.mtfMatrix.daily.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${rec.mtfMatrix.daily.bias === 'BULLISH' ? '#34d399' : '#f87171'}; border: 1px solid ${rec.mtfMatrix.daily.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                D: ${rec.mtfMatrix.daily.bias === 'BULLISH' ? '▲ BULL' : '▼ BEAR'}
              </div>
              <div style="padding: 2px 4px; border-radius: 4px; background: ${rec.mtfMatrix.m15.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${rec.mtfMatrix.m15.bias === 'BULLISH' ? '#34d399' : '#f87171'}; border: 1px solid ${rec.mtfMatrix.m15.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                15m: ${rec.mtfMatrix.m15.bias === 'BULLISH' ? '▲ BULL' : '▼ BEAR'}
              </div>
              <div style="padding: 2px 4px; border-radius: 4px; background: ${rec.mtfMatrix.m5.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${rec.mtfMatrix.m5.bias === 'BULLISH' ? '#34d399' : '#f87171'}; border: 1px solid ${rec.mtfMatrix.m5.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                5m: ${rec.mtfMatrix.m5.bias === 'BULLISH' ? '▲ BULL' : '▼ BEAR'}
              </div>
              <div style="padding: 2px 4px; border-radius: 4px; background: ${rec.mtfMatrix.m1.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${rec.mtfMatrix.m1.bias === 'BULLISH' ? '#34d399' : '#f87171'}; border: 1px solid ${rec.mtfMatrix.m1.bias === 'BULLISH' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                1m: ${rec.mtfMatrix.m1.bias === 'BULLISH' ? '▲ BULL' : '▼ BEAR'}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Position Sizing & Realistic Taxes Box -->
          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; font-size:0.78rem; font-family:var(--font-mono); border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#94a3b8;">Sizing (₹${capital.toLocaleString()} @ ${leverage}x):</span>
              <strong style="color:#38bdf8;">${rec.sizing.shares} shares</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#94a3b8;">Max Risk / Margin:</span>
              <span style="color:${rec.sizing.riskAmount <= 15 ? '#10b981' : '#f59e0b'};">₹${rec.sizing.riskAmount} / ₹${rec.sizing.marginRequired}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top:1px dashed rgba(255,255,255,0.08); padding-top:3px; margin-top:3px;">
              <span style="color:#94a3b8;">Net Profit (after NSE taxes):</span>
              <strong style="color:#10b981;">+₹${rec.netProfitT1}</strong>
            </div>
          </div>

          <div class="indicators-strip">
            <span>VWAP: <strong>₹${rec.vwap.toFixed(2)}</strong></span>
            <span>ST: <strong style="color:${rec.supertrendDir === 1 ? '#10b981' : '#ef4444'}">₹${rec.supertrend.toFixed(1)}</strong></span>
            <span>RSI: <strong>${rec.rsi}</strong></span>
            <span>R:R: <strong>1:${rec.riskRewardRatio}</strong></span>
          </div>
        </div>

        <div class="trade-card-footer">
          <button class="btn-secondary" onclick="viewInChart('${rec.symbol}')">
            <span>📈</span> Inspect Chart
          </button>
          <button class="btn-primary" style="${isTrap ? 'background: #334155; opacity:0.8;' : ''}" onclick="oneClickPaperTrade('${rec.symbol}', ${rec.sizing.shares}, ${rec.entry}, ${rec.stopLoss}, ${rec.target1})">
            <span>⚡</span> ${isTrap ? 'Paper Trade Pullback' : '1-Click Paper Trade'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// 1-Click Paper Trade execution
window.oneClickPaperTrade = function(symbol, quantity, entryPrice, stopLoss, target) {
  if (!window.paperEngine) return;

  const result = window.paperEngine.executeTrade({
    symbol,
    action: "BUY",
    type: "MIS",
    quantity,
    price: entryPrice,
    stopLoss,
    target
  });

  if (result.success) {
    window.showToast(result.message, "success");
    const paperTab = document.querySelector('[data-tab="tabPaper"]');
    if (paperTab) paperTab.click();
  } else {
    window.showToast(result.message, "error");
  }
};

window.viewInChart = function(symbol) {
  const chartTabBtn = document.querySelector('[data-tab="tabChart"]');
  if (chartTabBtn) chartTabBtn.click();

  const sel = document.getElementById("selectChartSymbol");
  if (sel) {
    sel.value = symbol;
    sel.dispatchEvent(new Event("change"));
  }
};

function setupChartControls() {
  const symSelect = document.getElementById("selectChartSymbol");
  if (symSelect) {
    symSelect.addEventListener("change", (e) => {
      if (window.chartStudio) {
        window.chartStudio.loadSymbol(e.target.value);
      }
    });
  }

  document.querySelectorAll(".ind-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const ind = btn.getAttribute("data-ind");
      if (window.chartStudio) {
        window.chartStudio.toggleIndicator(ind);
      }
    });
  });
}

function setupPaperTradingForm() {
  const form = document.getElementById("paperOrderForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const symbol = document.getElementById("orderSymbol")?.value || "PNB";
      const action = document.getElementById("orderAction")?.value || "BUY";
      const type = document.getElementById("orderProduct")?.value || "MIS";
      const quantity = parseInt(document.getElementById("orderQty")?.value || 1);
      const stock = window.MarketData.stocks[symbol];
      const price = stock ? stock.price : 100;
      const stopLoss = parseFloat(document.getElementById("orderSL")?.value || 0);
      const target = parseFloat(document.getElementById("orderTgt")?.value || 0);

      const res = window.paperEngine.executeTrade({
        symbol,
        action,
        type,
        quantity,
        price,
        stopLoss,
        target
      });

      if (res.success) {
        window.showToast(res.message, "success");
        form.reset();
      } else {
        window.showToast(res.message, "error");
      }
    });
  }

  const resetBtn = document.getElementById("btnResetAccount");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const cap = prompt("Reset paper account with capital (INR):", "1000");
      if (cap && !isNaN(cap)) {
        window.paperEngine.resetAccount(parseFloat(cap));
        window.showToast(`Paper trading account reset to ₹${parseFloat(cap).toLocaleString()}`, "info");
      }
    });
  }

  const simBtn = document.getElementById("btnSimulateSession");
  if (simBtn) {
    simBtn.addEventListener("click", () => {
      window.paperEngine.simulateMarketHoursSession();
    });
  }

  const autoBotBtn = document.getElementById("btnToggleAutoBot");
  if (autoBotBtn) {
    autoBotBtn.addEventListener("click", () => {
      window.paperEngine.toggleAutonomousBot();
    });
  }

  function updateGeminiStatusUI() {
    const el = document.getElementById("btnGeminiStatus");
    if (!el || !window.GeminiAI) return;
    const hasKey = window.GeminiAI.isConfigured();
    if (hasKey) {
      el.innerHTML = `<span class="pulse-dot" style="background:#10b981;"></span><span>GEMINI 2.5 ONLINE</span>`;
      el.style.background = "rgba(16, 185, 129, 0.15)";
      el.style.borderColor = "rgba(16, 185, 129, 0.3)";
      el.style.color = "#10b981";
      el.title = "Gemini AI is connected. Click to view or update key.";
    } else {
      el.innerHTML = `<span>🔑</span><span>CONNECT GEMINI AI</span>`;
      el.style.background = "rgba(59, 130, 246, 0.15)";
      el.style.borderColor = "rgba(59, 130, 246, 0.3)";
      el.style.color = "#38bdf8";
      el.title = "Click to enter your Gemini API Key for live AI quant analysis.";
    }
  }

  updateGeminiStatusUI();

  const geminiStatusBtn = document.getElementById("btnGeminiStatus");
  if (geminiStatusBtn) {
    geminiStatusBtn.addEventListener("click", () => {
      const current = window.GeminiAI ? window.GeminiAI.getApiKey() : "";
      const updated = prompt("Enter Google Gemini API Key for AI Analysis:", current);
      if (updated !== null && updated.trim()) {
        if (window.GeminiAI) window.GeminiAI.setApiKey(updated);
        updateGeminiStatusUI();
        window.showToast("Gemini API Key saved securely to localStorage!", "success");
      }
    });
  }
}

// Strategy Lab / Backtester UI (v3 with Supertrend + VWAP Confluence)
function setupBacktester() {
  const runBtn = document.getElementById("btnRunBacktest");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      runBacktestUI();
    });
  }
}

function runBacktestUI() {
  const sym = document.getElementById("selectBacktestSymbol")?.value || "PNB";
  const capital = parseFloat(document.getElementById("inputCapital")?.value || 1000);

  // Compare all 4 strategies
  const stratA = window.StrategyBacktester.runBacktest(sym, "breakout_chasing", capital, 1.5);
  const stratB = window.StrategyBacktester.runBacktest(sym, "vwap_pullback", capital, 1.5);
  const stratC = window.StrategyBacktester.runBacktest(sym, "supertrend_vwap_confluence", capital, 1.5);
  const stratD = window.StrategyBacktester.runBacktest(sym, "turtle_soup_fade", capital, 1.5);

  const container = document.getElementById("backtestResultsGrid");
  if (!container) return;

  container.innerHTML = `
    <!-- Strategy A: Naive Breakout -->
    <div class="stat-box" style="border-left: 4px solid #ef4444;">
      <div style="font-size:0.8rem; font-weight:700; color:#ef4444; margin-bottom:0.25rem;">
        Strategy 1: Chasing Morning Breakouts (Flawed)
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">Buying 5-day highs blindly at 9:15 AM open</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-family:var(--font-mono); font-size:0.85rem;">
        <div>Win Rate: <strong style="color:#ef4444;">${stratA.winRate}%</strong></div>
        <div>Profit Factor: <strong>${stratA.profitFactor}</strong></div>
        <div>Max Drawdown: <strong style="color:#ef4444;">-${stratA.maxDrawdownPct}%</strong></div>
        <div>Net P&L: <strong style="color:${stratA.netPnL >= 0 ? '#10b981' : '#ef4444'};">${stratA.netPnL >= 0 ? '+' : ''}₹${stratA.netPnL}</strong></div>
      </div>
    </div>

    <!-- Strategy B: VWAP Pullback -->
    <div class="stat-box" style="border-left: 4px solid #3b82f6;">
      <div style="font-size:0.8rem; font-weight:700; color:#38bdf8; margin-bottom:0.25rem;">
        Strategy 2: VWAP Pullback Re-Test
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">Buying dips at VWAP with tight 0.4× ATR stop</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-family:var(--font-mono); font-size:0.85rem;">
        <div>Win Rate: <strong style="color:#38bdf8;">${stratB.winRate}%</strong></div>
        <div>Profit Factor: <strong>${stratB.profitFactor}</strong></div>
        <div>Max Drawdown: <strong>-${stratB.maxDrawdownPct}%</strong></div>
        <div>Net P&L: <strong style="color:#38bdf8;">+₹${stratB.netPnL}</strong></div>
      </div>
    </div>

    <!-- Strategy C: Supertrend + VWAP Confluence (Top Tier) -->
    <div class="stat-box" style="border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.05);">
      <div style="font-size:0.8rem; font-weight:700; color:#10b981; margin-bottom:0.25rem;">
        ⭐ Strategy 3: Supertrend (10,3) + VWAP Confluence
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">Supertrend Bullish + VWAP bounce confirmation</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-family:var(--font-mono); font-size:0.85rem;">
        <div>Win Rate: <strong style="color:#10b981;">${stratC.winRate}%</strong></div>
        <div>Profit Factor: <strong style="color:#10b981;">${stratC.profitFactor}</strong></div>
        <div>Expectancy: <strong style="color:#10b981;">+₹${stratC.expectancy}/trade</strong></div>
        <div>Net P&L: <strong style="color:#10b981;">+₹${stratC.netPnL}</strong></div>
      </div>
    </div>

    <!-- Strategy D: Fade the Fakeout -->
    <div class="stat-box" style="border-left: 4px solid #06b6d4;">
      <div style="font-size:0.8rem; font-weight:700; color:#06b6d4; margin-bottom:0.25rem;">
        Strategy 4: Turtle Soup Fakeout Fade
      </div>
      <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.75rem;">Shorting failed morning surges back to VWAP</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-family:var(--font-mono); font-size:0.85rem;">
        <div>Win Rate: <strong style="color:#06b6d4;">${stratD.winRate}%</strong></div>
        <div>Profit Factor: <strong>${stratD.profitFactor}</strong></div>
        <div>Max Drawdown: <strong>-${stratD.maxDrawdownPct}%</strong></div>
        <div>Net P&L: <strong style="color:${stratD.netPnL >= 0 ? '#10b981' : '#ef4444'};">${stratD.netPnL >= 0 ? '+' : ''}₹${stratD.netPnL}</strong></div>
      </div>
    </div>
  `;

  // Render recent backtest trades log
  const logTable = document.getElementById("backtestTradesTableBody");
  if (logTable) {
    logTable.innerHTML = stratC.trades.map(t => `
      <tr>
        <td>${t.date}</td>
        <td><strong>${t.symbol}</strong></td>
        <td><span style="color:#10b981; font-weight:700;">${t.action}</span></td>
        <td>₹${t.entryPrice}</td>
        <td>₹${t.exitPrice}</td>
        <td style="color:${t.pnl >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">${t.pnl >= 0 ? '+' : ''}₹${t.pnl}</td>
        <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:3px;">${t.outcome}</span></td>
      </tr>
    `).join("");
  }
}

// Setup Claude Copilot AI Assistant
function setupCopilot() {
  const form = document.getElementById("copilotForm");
  const input = document.getElementById("copilotInput");
  const stream = document.getElementById("copilotChatStream");
  const chips = document.querySelectorAll(".copilot-chip");

  if (!form || !input || !stream) return;

  async function askCopilot(query) {
    if (!query || !query.trim()) return;
    const capital = parseFloat(document.getElementById("inputCapital")?.value || 1000);

    // Append user message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-bubble user";
    userMsg.innerText = query;
    stream.appendChild(userMsg);
    stream.scrollTop = stream.scrollHeight;

    // Show typing state
    const typingMsg = document.createElement("div");
    typingMsg.className = "chat-bubble assistant";
    typingMsg.id = "copilotTyping";
    typingMsg.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.4rem; color:#94a3b8; font-size:0.8rem;">
        <span class="pulse-dot" style="background:#10b981;"></span>
        <span>Gemini 2.5 Flash running live NSE quant analysis...</span>
      </div>
    `;
    stream.appendChild(typingMsg);
    stream.scrollTop = stream.scrollHeight;

    // Check if a symbol is mentioned
    let targetSym = null;
    const upperQ = query.toUpperCase();
    for (const sym of Object.keys(window.MarketData.stocks)) {
      if (upperQ.includes(sym)) {
        targetSym = sym;
        break;
      }
    }
    const stockContext = targetSym ? window.MarketData.stocks[targetSym] : null;

    try {
      if (window.GeminiAI && window.GeminiAI.isConfigured()) {
        const geminiRes = await window.GeminiAI.generateAnalysis(query, stockContext, capital);
        const el = document.getElementById("copilotTyping");
        if (el) el.remove();

        // Convert markdown to clean HTML
        let formattedText = geminiRes.text
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n- /g, '<br>• ');

        const assistantMsg = document.createElement("div");
        assistantMsg.className = "chat-bubble assistant";
        assistantMsg.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0.35rem;">
            <span style="font-weight:700; color:#38bdf8; font-size:0.85rem;">🤖 Gemini AI (${geminiRes.model})</span>
            <span style="font-size:0.7rem; background:rgba(16,185,129,0.15); color:#10b981; padding:2px 6px; border-radius:3px;">LIVE GEMINI API</span>
          </div>
          <div style="font-size:0.85rem; line-height:1.6; color:#cbd5e1;">
            ${formattedText}
          </div>
          ${stockContext ? `
            <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn-primary" style="font-size:0.78rem; padding:0.35rem 0.75rem;" onclick="window.viewInChart('${stockContext.symbol}')">
                <span>📈</span> View ${stockContext.symbol} Chart
              </button>
            </div>
          ` : ''}
        `;
        stream.appendChild(assistantMsg);
        stream.scrollTop = stream.scrollHeight;
        return;
      }
    } catch (err) {
      console.warn("Gemini API call fell back to local engine:", err);
    }

    // Fallback to local quant engine
    setTimeout(() => {
      const el = document.getElementById("copilotTyping");
      if (el) el.remove();

      const responseHtml = window.ClaudeCopilot.analyzeQuery(query, capital);
      const assistantMsg = document.createElement("div");
      assistantMsg.className = "chat-bubble assistant";
      assistantMsg.innerHTML = responseHtml;
      stream.appendChild(assistantMsg);
      stream.scrollTop = stream.scrollHeight;
    }, 250);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = "";
    askCopilot(q);
  });

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      askCopilot(prompt);
    });
  });

  window.askCopilotPrompt = function(promptText) {
    const copilotTabBtn = document.querySelector('[data-tab="tabCopilot"]');
    if (copilotTabBtn) copilotTabBtn.click();
    setTimeout(() => {
      askCopilot(promptText);
    }, 150);
  };
}
