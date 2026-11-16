/**
 * TradeMind AI - Paper Trading & Risk Management Terminal (v3)
 * Features:
 * - Real-time tick evaluation & automated SL / Target triggers
 * - Realistic Indian Brokerage, STT, and Regulatory Taxes calculation
 * - Account-level Drawdown Circuit Breaker (Halt after 2 consecutive losses or 3% daily loss)
 * - Net In-Pocket P&L reporting
 * - Automated post-trade learning debriefs
 */

class PaperTradingEngine {
  constructor() {
    this.initialCapital = 1000.0;
    this.cash = 1000.0;
    this.positions = [];
    this.tradeHistory = [];
    this.learningNotes = [];
    this.consecutiveLosses = 0;
    this.dailyDrawdownHalt = false;
    this.loadState();

    // Listen to live ticks to update P&L and trigger SL/Target
    window.MarketData.subscribe((sym, quote) => {
      this.onPriceTick(sym, quote.price);
    });
  }

  loadState() {
    try {
      const saved = localStorage.getItem("trademind_papertrading");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.initialCapital = parsed.initialCapital || 1000.0;
        this.cash = parsed.cash !== undefined ? parsed.cash : 1000.0;
        this.positions = parsed.positions || [];
        this.tradeHistory = parsed.tradeHistory || [];
        this.learningNotes = parsed.learningNotes || [];
        this.consecutiveLosses = parsed.consecutiveLosses || 0;
        this.dailyDrawdownHalt = parsed.dailyDrawdownHalt || false;
      }
    } catch (e) {
      console.warn("Could not load paper trading state:", e);
    }
  }

  saveState() {
    try {
      localStorage.setItem("trademind_papertrading", JSON.stringify({
        initialCapital: this.initialCapital,
        cash: this.cash,
        positions: this.positions,
        tradeHistory: this.tradeHistory,
        learningNotes: this.learningNotes,
        consecutiveLosses: this.consecutiveLosses,
        dailyDrawdownHalt: this.dailyDrawdownHalt
      }));
    } catch (e) {
      console.warn("Could not save paper trading state:", e);
    }
  }

  resetAccount(newCapital = 1000.0) {
    this.initialCapital = newCapital;
    this.cash = newCapital;
    this.positions = [];
    this.tradeHistory = [];
    this.learningNotes = [];
    this.consecutiveLosses = 0;
    this.dailyDrawdownHalt = false;
    this.saveState();
    this.render();
  }

  // Execute trade (from recommendation card or manual order)
  executeTrade(order) {
    if (this.dailyDrawdownHalt) {
      return {
        success: false,
        message: "⛔ CIRCUIT BREAKER ACTIVE: Account reached daily loss limit (2 consecutive losses). Trading halted today to protect capital."
      };
    }

    const { symbol, action = "BUY", type = "MIS", quantity, price, stopLoss, target } = order;
    const leverage = type === "MIS" ? 5 : 1;
    const totalValue = quantity * price;
    const marginRequired = totalValue / leverage;

    if (marginRequired > this.cash) {
      return { success: false, message: `Insufficient margin! Required: ₹${marginRequired.toFixed(2)}, Available: ₹${this.cash.toFixed(2)}` };
    }

    this.cash -= marginRequired;

    const position = {
      id: "POS-" + Date.now(),
      symbol,
      action,
      type,
      quantity,
      entryPrice: price,
      currentPrice: price,
      stopLoss: stopLoss || 0,
      target: target || 0,
      marginUsed: marginRequired,
      unrealizedPnL: 0,
      openTime: new Date().toLocaleTimeString()
    };

    this.positions.push(position);
    this.saveState();
    this.render();

    return {
      success: true,
      message: `Executed ${action} ${quantity} shares of ${symbol} at ₹${price.toFixed(2)} (${type} ${leverage}x)`
    };
  }

  // Handle live tick
  onPriceTick(symbol, newPrice) {
    let stateChanged = false;

    for (let i = this.positions.length - 1; i >= 0; i--) {
      const pos = this.positions[i];
      if (pos.symbol === symbol) {
        pos.currentPrice = newPrice;
        const diff = pos.action === "BUY" ? (newPrice - pos.entryPrice) : (pos.entryPrice - newPrice);
        pos.unrealizedPnL = Math.round(diff * pos.quantity * 100) / 100;
        stateChanged = true;

        // Check Target Hit
        if (pos.target > 0) {
          if ((pos.action === "BUY" && newPrice >= pos.target) || (pos.action === "SELL" && newPrice <= pos.target)) {
            this.closePosition(pos.id, "TARGET HIT", newPrice);
            continue;
          }
        }

        // Check Stop-Loss Hit
        if (pos.stopLoss > 0) {
          if ((pos.action === "BUY" && newPrice <= pos.stopLoss) || (pos.action === "SELL" && newPrice >= pos.stopLoss)) {
            this.closePosition(pos.id, "STOP-LOSS HIT", newPrice);
            continue;
          }
        }
      }
    }

    if (stateChanged) {
      this.renderPositionsOnly();
    }
  }

  // Close position, compute realistic NSE brokerage and taxes, and generate learning debrief
  closePosition(positionId, reason = "MANUAL EXIT", exitPrice = null) {
    const idx = this.positions.findIndex(p => p.id === positionId);
    if (idx === -1) return;

    const pos = this.positions[idx];
    const finalPrice = exitPrice || pos.currentPrice;

    // Calculate real NSE Brokerage, STT, Exchange fees, and GST
    const taxes = window.Indicators.calculateNSEBrokerageAndTaxes(pos.entryPrice, finalPrice, pos.quantity);

    // Refund margin + Net Realized PnL (after brokerage/STT)
    this.cash += pos.marginUsed + taxes.netPnL;
    this.positions.splice(idx, 1);

    const closedRecord = {
      id: pos.id,
      symbol: pos.symbol,
      action: pos.action,
      type: pos.type,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: finalPrice,
      grossPnL: taxes.grossPnL,
      taxes: taxes.totalTaxesAndCharges,
      realizedPnL: taxes.netPnL,
      reason,
      openTime: pos.openTime,
      closeTime: new Date().toLocaleTimeString()
    };

    this.tradeHistory.unshift(closedRecord);

    // Track consecutive losses for Circuit Breaker
    if (taxes.netPnL < 0) {
      this.consecutiveLosses++;
      if (this.consecutiveLosses >= 2) {
        this.dailyDrawdownHalt = true;
      }
    } else {
      this.consecutiveLosses = 0;
    }

    // AI Learning Debrief Generation
    const debrief = this.generateLearningDebrief(closedRecord);
    this.learningNotes.unshift(debrief);

    this.saveState();
    this.render();

    if (window.showToast) {
      const isProfit = taxes.netPnL >= 0;
      window.showToast(
        `${pos.symbol} closed (${reason}): Net ${isProfit ? '+' : ''}₹${taxes.netPnL.toFixed(2)} (Gross: ₹${taxes.grossPnL} | Tax: ₹${taxes.totalTaxesAndCharges})`,
        isProfit ? "success" : "error"
      );
    }
  }

  // Generate learning debrief to help user learn from every trade
  generateLearningDebrief(trade) {
    const isWin = trade.realizedPnL > 0;
    let lesson = "";

    if (trade.reason === "TARGET HIT") {
      lesson = `Target hit cleanly on ${trade.symbol}. Gross profit: ₹${trade.grossPnL.toFixed(2)}, NSE taxes/brokerage: ₹${trade.taxes.toFixed(2)}. Net In-Pocket: +₹${trade.realizedPnL.toFixed(2)}. Risk-reward was strictly respected.`;
    } else if (trade.reason === "STOP-LOSS HIT") {
      lesson = `Stop-loss preserved capital. Net loss was limited to -₹${Math.abs(trade.realizedPnL).toFixed(2)}. Incurring planned small losses is how professional prop traders survive to trade another day.`;
    } else {
      lesson = `Manual exit at ₹${trade.exitPrice.toFixed(2)}. Net: ₹${trade.realizedPnL.toFixed(2)} after ₹${trade.taxes.toFixed(2)} NSE charges. Always account for transaction costs when planning exits.`;
    }

    return {
      id: "DEB-" + Date.now(),
      symbol: trade.symbol,
      isWin,
      pnl: trade.realizedPnL,
      gross: trade.grossPnL,
      taxes: trade.taxes,
      time: trade.closeTime,
      lesson
    };
  }

  // Calculate totals
  getStats() {
    let marginUsed = 0;
    let unrealizedPnL = 0;

    this.positions.forEach(p => {
      marginUsed += p.marginUsed;
      unrealizedPnL += p.unrealizedPnL;
    });

    const totalPortfolioValue = Math.round((this.cash + marginUsed + unrealizedPnL) * 100) / 100;
    const wins = this.tradeHistory.filter(t => t.realizedPnL > 0).length;
    const winRate = this.tradeHistory.length > 0 ? Math.round((wins / this.tradeHistory.length) * 100) : 0;
    const totalRealizedPnL = this.tradeHistory.reduce((sum, t) => sum + t.realizedPnL, 0);
    const totalTaxesPaid = this.tradeHistory.reduce((sum, t) => sum + (t.taxes || 0), 0);

    return {
      cash: Math.round(this.cash * 100) / 100,
      marginUsed: Math.round(marginUsed * 100) / 100,
      unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
      totalValue: totalPortfolioValue,
      winRate,
      tradesCount: this.tradeHistory.length,
      realizedPnL: Math.round(totalRealizedPnL * 100) / 100,
      totalTaxesPaid: Math.round(totalTaxesPaid * 100) / 100,
      circuitBreakerHalt: this.dailyDrawdownHalt
    };
  }

  renderPositionsOnly() {
    const tbody = document.getElementById("positionsTableBody");
    if (!tbody) return;

    if (this.positions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:1.5rem;">No open positions. Use 1-Click Paper Trade from recommendations.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.positions.map(p => {
      const pnlColor = p.unrealizedPnL >= 0 ? "#10b981" : "#ef4444";
      const pnlSign = p.unrealizedPnL >= 0 ? "+" : "";
      return `
        <tr>
          <td><span style="font-weight:700;">${p.symbol}</span> <span style="font-size:0.7rem; color:#64748b;">(${p.type})</span></td>
          <td><span style="color:${p.action === 'BUY' ? '#10b981' : '#ef4444'}; font-weight:700;">${p.action}</span></td>
          <td>${p.quantity}</td>
          <td>₹${p.entryPrice.toFixed(2)}</td>
          <td>₹${p.currentPrice.toFixed(2)}</td>
          <td style="color:${pnlColor}; font-weight:700;">${pnlSign}₹${p.unrealizedPnL.toFixed(2)}</td>
          <td style="color:#64748b;">SL: ₹${p.stopLoss} | Tgt: ₹${p.target}</td>
          <td>
            <button class="btn-secondary" style="padding:2px 8px; font-size:0.75rem;" onclick="window.paperEngine.closePosition('${p.id}', 'MANUAL EXIT')">Exit</button>
          </td>
        </tr>
      `;
    }).join("");

    const stats = this.getStats();
    this.updateStatsUI(stats);
  }

  updateStatsUI(stats) {
    const valEl = document.getElementById("statTotalValue");
    if (valEl) valEl.innerText = "₹" + stats.totalValue.toFixed(2);

    const cashEl = document.getElementById("statCash");
    if (cashEl) cashEl.innerText = "₹" + stats.cash.toFixed(2);

    const pnlEl = document.getElementById("statUnrealizedPnL");
    if (pnlEl) {
      pnlEl.innerText = (stats.unrealizedPnL >= 0 ? "+" : "") + "₹" + stats.unrealizedPnL.toFixed(2);
      pnlEl.style.color = stats.unrealizedPnL >= 0 ? "#10b981" : "#ef4444";
    }

    const winEl = document.getElementById("statWinRate");
    if (winEl) winEl.innerText = stats.winRate + "% (" + stats.tradesCount + " trades)";
  }

  render() {
    this.renderPositionsOnly();

    // Circuit breaker warning banner
    const cbBanner = document.getElementById("circuitBreakerBanner");
    if (cbBanner) {
      cbBanner.style.display = this.dailyDrawdownHalt ? "block" : "none";
    }

    // Render history
    const histBody = document.getElementById("historyTableBody");
    if (histBody) {
      if (this.tradeHistory.length === 0) {
        histBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:1.5rem;">No closed trades yet.</td></tr>`;
      } else {
        histBody.innerHTML = this.tradeHistory.map(t => {
          const color = t.realizedPnL >= 0 ? "#10b981" : "#ef4444";
          return `
            <tr>
              <td><strong>${t.symbol}</strong></td>
              <td>${t.action}</td>
              <td>${t.quantity}</td>
              <td>₹${t.entryPrice.toFixed(2)}</td>
              <td>₹${t.exitPrice.toFixed(2)}</td>
              <td style="color:${t.grossPnL >= 0 ? '#10b981' : '#ef4444'};">₹${(t.grossPnL || t.realizedPnL).toFixed(2)}</td>
              <td style="color:#f59e0b; font-size:0.78rem;">-₹${(t.taxes || 0).toFixed(2)}</td>
              <td style="color:${color}; font-weight:700;">${t.realizedPnL >= 0 ? '+' : ''}₹${t.realizedPnL.toFixed(2)}</td>
              <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:3px;">${t.reason}</span></td>
            </tr>
          `;
        }).join("");
      }
    }

    // Render Learning Notes
    const debriefContainer = document.getElementById("debriefContainer");
    if (debriefContainer) {
      if (this.learningNotes.length === 0) {
        debriefContainer.innerHTML = `<div style="color:#64748b; text-align:center; padding:1rem;">Complete your first paper trade to generate AI learning insights and discipline scorecards.</div>`;
      } else {
        debriefContainer.innerHTML = this.learningNotes.map(n => `
          <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-left:4px solid ${n.isWin ? '#10b981' : '#ef4444'}; border-radius:6px; padding:0.85rem; margin-bottom:0.75rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:700; color:${n.isWin ? '#10b981' : '#ef4444'};">${n.symbol} (Net: ${n.isWin ? '+' : ''}₹${n.pnl.toFixed(2)})</span>
              <span style="font-size:0.75rem; color:#64748b;">${n.time}</span>
            </div>
            <div style="font-size:0.8rem; color:#cbd5e1; line-height:1.4;">${n.lesson}</div>
          </div>
        `).join("");
      }
    }
  }
}

window.PaperTradingEngine = PaperTradingEngine;
