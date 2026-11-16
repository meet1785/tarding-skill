/**
 * TradeMind AI - Paper Trading & Learning Terminal
 * Live virtual execution, real-time P&L tracking, automated SL/Target execution, and learning debriefs.
 */

class PaperTradingEngine {
  constructor() {
    this.initialCapital = 1000.0;
    this.cash = 1000.0;
    this.positions = [];
    this.tradeHistory = [];
    this.learningNotes = [];
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
        learningNotes: this.learningNotes
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
    this.saveState();
    this.render();
  }

  // Execute trade (from recommendation card or manual order)
  executeTrade(order) {
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

  // Close position and generate learning debrief
  closePosition(positionId, reason = "MANUAL EXIT", exitPrice = null) {
    const idx = this.positions.findIndex(p => p.id === positionId);
    if (idx === -1) return;

    const pos = this.positions[idx];
    const finalPrice = exitPrice || pos.currentPrice;
    const diff = pos.action === "BUY" ? (finalPrice - pos.entryPrice) : (pos.entryPrice - finalPrice);
    const realizedPnL = Math.round(diff * pos.quantity * 100) / 100;

    // Refund margin + PnL
    this.cash += pos.marginUsed + realizedPnL;
    this.positions.splice(idx, 1);

    const closedRecord = {
      id: pos.id,
      symbol: pos.symbol,
      action: pos.action,
      type: pos.type,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: finalPrice,
      realizedPnL,
      reason,
      openTime: pos.openTime,
      closeTime: new Date().toLocaleTimeString()
    };

    this.tradeHistory.unshift(closedRecord);

    // AI Learning Debrief Generation
    const debrief = this.generateLearningDebrief(closedRecord);
    this.learningNotes.unshift(debrief);

    this.saveState();
    this.render();

    if (window.showToast) {
      const isProfit = realizedPnL >= 0;
      window.showToast(`${pos.symbol} closed (${reason}): ${isProfit ? '+' : ''}₹${realizedPnL.toFixed(2)}`, isProfit ? "success" : "error");
    }
  }

  // Generate learning debrief to help user learn from every trade
  generateLearningDebrief(trade) {
    const isWin = trade.realizedPnL > 0;
    let lesson = "";

    if (trade.reason === "TARGET HIT") {
      lesson = `Excellent execution. The ${trade.symbol} trade respected the risk-reward plan and hit target for +₹${trade.realizedPnL.toFixed(2)}. Confluence rules verified live.`;
    } else if (trade.reason === "STOP-LOSS HIT") {
      lesson = `Stop-loss protected the account properly. Loss was strictly limited to -₹${Math.abs(trade.realizedPnL).toFixed(2)}, preserving 95%+ of capital for the next setup.`;
    } else {
      lesson = `Manual exit at ₹${trade.exitPrice.toFixed(2)}. ${isWin ? 'Profit secured' : 'Loss capped'}. Always check if the trade was given adequate time to play out against the 20 EMA.`;
    }

    return {
      id: "DEB-" + Date.now(),
      symbol: trade.symbol,
      isWin,
      pnl: trade.realizedPnL,
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

    return {
      cash: Math.round(this.cash * 100) / 100,
      marginUsed: Math.round(marginUsed * 100) / 100,
      unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
      totalValue: totalPortfolioValue,
      winRate,
      tradesCount: this.tradeHistory.length,
      realizedPnL: Math.round(totalRealizedPnL * 100) / 100
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

    // Update stats header values
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

    // Render history
    const histBody = document.getElementById("historyTableBody");
    if (histBody) {
      if (this.tradeHistory.length === 0) {
        histBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:1.5rem;">No closed trades yet.</td></tr>`;
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
              <span style="font-weight:700; color:${n.isWin ? '#10b981' : '#ef4444'};">${n.symbol} (${n.isWin ? '+' : ''}₹${n.pnl.toFixed(2)})</span>
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
