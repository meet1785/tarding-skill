/**
 * TradeMind AI - Main Application Controller
 * Handles user interactions, tab switching, recommendations rendering, and toast alerts.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize subsystems
  window.MarketData.startLiveFeed();
  window.chartStudio = new window.ChartStudio("chartContainer");
  window.paperEngine = new window.PaperTradingEngine();

  // Populate ticker tape
  populateTickerTape();

  // Initialize tabs
  setupTabs();

  // Setup scanner trigger
  setupScanner();

  // Setup chart controls
  setupChartControls();

  // Setup paper trading manual form
  setupPaperTradingForm();

  // Initial scan on load
  runScan();

  // Start chart after layout stabilizes
  setTimeout(() => {
    window.chartStudio.init();
    window.paperEngine.render();
  }, 100);
});

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

// Populate Ticker Tape with Indices and Top Stocks
function populateTickerTape() {
  const tickerWrap = document.getElementById("tickerMove");
  if (!tickerWrap) return;

  const items = [];

  // Indices
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

  // Top stocks
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

  // Double items for continuous loop
  tickerWrap.innerHTML = items.join("") + items.join("");

  // Update on live ticks
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

        // Resize chart if switching to chart studio
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

        // Render paper trading if switching
        if (target === "tabPaper" && window.paperEngine) {
          window.paperEngine.render();
        }
      }
    });
  });
}

// Setup Scanner & Filters
function setupScanner() {
  const scanBtn = document.getElementById("btnRunScan");
  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      runScan();
    });
  }

  // Quick capital preset buttons
  document.querySelectorAll(".preset-cap-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cap = btn.getAttribute("data-cap");
      const input = document.getElementById("inputCapital");
      if (input) input.value = cap;
      runScan();
    });
  });
}

// Run Deep AI Research Scan
async function runScan() {
  const btn = document.getElementById("btnRunScan");
  if (btn) btn.disabled = true;

  const capital = parseFloat(document.getElementById("inputCapital")?.value || 1000);
  const leverage = parseInt(document.getElementById("selectLeverage")?.value || 5);
  const riskPct = parseFloat(document.getElementById("selectRisk")?.value || 1.5);
  const sector = document.getElementById("selectSector")?.value || "all";

  // Update header capital badge
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
  }, 400);
}

// Render Recommendation Cards
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
    const isTop = index === 0;
    const isUp = rec.stock.pChange >= 0;

    return `
      <div class="trade-card ${isTop ? 'top-pick' : ''}">
        <div class="trade-card-header">
          <div class="sym-name-group">
            <div class="sym-title">
              ${rec.symbol}
              ${isTop ? '<span class="sym-badge" style="background:#2563eb; color:#fff; font-weight:700;">TOP PICK</span>' : ''}
            </div>
            <div class="sym-sector">${rec.name} • ${rec.sector}</div>
          </div>
          <div class="price-group">
            <div class="current-price" id="card-price-${rec.symbol}">₹${rec.price.toFixed(2)}</div>
            <div class="price-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${rec.stock.pChange}%</div>
          </div>
        </div>

        <div class="trade-card-body">
          <div class="score-pill-container">
            <span class="score-label">AI Confluence Confidence</span>
            <span class="score-val">${rec.confluenceScore}% High Conviction</span>
          </div>

          <div class="thesis-box">
            <strong>Setup:</strong> ${rec.setupType}<br>
            ${rec.thesis}
          </div>

          <div class="ticket-grid">
            <div class="ticket-row">
              <span class="ticket-label">Planned Entry</span>
              <span class="ticket-value entry">₹${rec.entry.toFixed(2)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Stop-Loss (Hard)</span>
              <span class="ticket-value sl">₹${rec.stopLoss.toFixed(2)}</span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Target 1 (1.5R)</span>
              <span class="ticket-value tgt">₹${rec.target1.toFixed(2)} <small>(+₹${rec.profitT1})</small></span>
            </div>
            <div class="ticket-row">
              <span class="ticket-label">Target 2 (2.5R)</span>
              <span class="ticket-value tgt">₹${rec.target2.toFixed(2)} <small>(+₹${rec.profitT2})</small></span>
            </div>
          </div>

          <div style="background:var(--bg-primary); padding:0.65rem 0.85rem; border-radius:6px; font-size:0.78rem; font-family:var(--font-mono); border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span style="color:#94a3b8;">Sizing (₹${capital.toLocaleString()} @ ${leverage}x):</span>
              <strong style="color:#38bdf8;">${rec.sizing.shares} shares</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#94a3b8;">Max Risk / Margin:</span>
              <span>₹${rec.sizing.riskAmount} / ₹${rec.sizing.marginRequired}</span>
            </div>
          </div>

          <div class="indicators-strip">
            <span>RSI: <strong>${rec.rsi}</strong></span>
            <span>ATR: <strong>₹${rec.atr}</strong></span>
            <span>R:R: <strong>1:${rec.riskRewardRatio}</strong></span>
          </div>
        </div>

        <div class="trade-card-footer">
          <button class="btn-secondary" onclick="viewInChart('${rec.symbol}')">
            <span>📈</span> View Chart
          </button>
          <button class="btn-primary" onclick="oneClickPaperTrade('${rec.symbol}', ${rec.sizing.shares}, ${rec.entry}, ${rec.stopLoss}, ${rec.target1})">
            <span>⚡</span> 1-Click Paper Trade
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// View stock in Interactive Chart Studio
window.viewInChart = function(symbol) {
  // Switch to chart tab
  const chartTab = document.querySelector('[data-tab="tabChart"]');
  if (chartTab) chartTab.click();

  const symSelect = document.getElementById("selectChartSymbol");
  if (symSelect) symSelect.value = symbol;

  if (window.chartStudio) {
    window.chartStudio.loadSymbol(symbol);
  }
};

// 1-Click Paper Trade execution
window.oneClickPaperTrade = function(symbol, quantity, entryPrice, stopLoss, target) {
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
    // Switch to paper trading tab
    const paperTab = document.querySelector('[data-tab="tabPaper"]');
    if (paperTab) paperTab.click();
  } else {
    window.showToast(result.message, "error");
  }
};

// Chart Studio Controls
function setupChartControls() {
  const symSelect = document.getElementById("selectChartSymbol");
  if (symSelect) {
    symSelect.addEventListener("change", (e) => {
      if (window.chartStudio) {
        window.chartStudio.loadSymbol(e.target.value);
      }
    });
  }

  // Indicator toggle buttons
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

// Paper Trading Manual Form
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

  // Reset Account button
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
}
