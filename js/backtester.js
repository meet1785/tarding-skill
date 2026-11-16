/**
 * TradeMind AI - Quantitative Strategy Backtester (v3)
 * Statistically verifies trading strategies on historical NSE candles,
 * proving why breakout chasing fails and why Supertrend + VWAP Confluence creates an edge.
 */

const StrategyBacktester = {
  // Run backtest over historical candles for a symbol
  runBacktest(symbol = "PNB", strategyType = "supertrend_vwap_confluence", capital = 1000, riskPct = 1.5) {
    const candles = window.MarketData.getCandles(symbol, 60);
    const trades = [];
    let currentBalance = capital;
    let peakBalance = capital;
    let maxDrawdown = 0;

    const vwapData = window.Indicators.calculateVWAP(candles);
    const vwap = vwapData.vwap;
    const atrArr = window.Indicators.calculateATR(candles, 14);
    const stData = window.Indicators.calculateSupertrend(candles, 10, 3);
    const stValues = stData.supertrend;
    const stDirs = stData.direction;

    for (let i = 20; i < candles.length - 1; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      const currentVwap = vwap[i];
      const currentAtr = atrArr[i] || 3.0;
      const currentSt = stValues[i] || currentVwap;
      const currentStDir = stDirs[i] || 1;

      let entryPrice = 0;
      let stopLoss = 0;
      let target = 0;
      let isTrade = false;
      let action = "BUY";

      if (strategyType === "breakout_chasing") {
        // Retail Flawed Rule: Buy new 5-day high blindly
        const fiveDayHigh = Math.max(...candles.slice(i - 5, i).map(x => x.high));
        if (c.high > fiveDayHigh) {
          isTrade = true;
          entryPrice = fiveDayHigh + 0.1;
          stopLoss = entryPrice - currentAtr * 1.5;
          target = entryPrice + currentAtr * 1.5;
        }
      } else if (strategyType === "supertrend_vwap_confluence") {
        // Institutional Confluence Rule: Supertrend is Green AND Price bounces off VWAP
        const isBullishST = currentStDir === 1;
        const aboveVwap = c.close >= currentVwap;
        const nearVwap = Math.abs(c.low - currentVwap) / currentVwap <= 0.015;
        const bullishBounce = c.close > c.open;

        if (isBullishST && aboveVwap && nearVwap && bullishBounce) {
          isTrade = true;
          entryPrice = c.close;
          stopLoss = Math.min(currentVwap, currentSt) - 0.3 * currentAtr;
          const risk = entryPrice - stopLoss;
          target = entryPrice + risk * 2.2; // 2.2:1 R:R
        }
      } else if (strategyType === "vwap_pullback") {
        // Standard VWAP Pullback
        const touchVwap = prev.low <= currentVwap && prev.close >= currentVwap;
        const bullishBounce = c.close > currentVwap && c.close > c.open;
        if (touchVwap && bullishBounce) {
          isTrade = true;
          entryPrice = c.close;
          stopLoss = currentVwap - 0.4 * currentAtr;
          target = entryPrice + (entryPrice - stopLoss) * 2.0;
        }
      } else if (strategyType === "turtle_soup_fade") {
        // Linda Raschke's Fakeout Fade: Short failed 10-day breakout
        const tenDayHigh = Math.max(...candles.slice(i - 10, i).map(x => x.high));
        if (c.high > tenDayHigh && c.close < tenDayHigh) {
          isTrade = true;
          action = "SELL";
          entryPrice = tenDayHigh - 0.1;
          stopLoss = c.high + 0.1;
          target = entryPrice - (stopLoss - entryPrice) * 1.8;
        }
      }

      if (isTrade) {
        // Check next candle outcome
        const next = candles[i + 1];
        let exitPrice = 0;
        let outcome = "TIMEOUT";

        if (action === "BUY") {
          if (next.low <= stopLoss) {
            exitPrice = stopLoss;
            outcome = "STOP HIT";
          } else if (next.high >= target) {
            exitPrice = target;
            outcome = "TARGET HIT";
          } else {
            exitPrice = next.close;
            outcome = "EOD EXIT";
          }
        } else {
          if (next.high >= stopLoss) {
            exitPrice = stopLoss;
            outcome = "STOP HIT";
          } else if (next.low <= target) {
            exitPrice = target;
            outcome = "TARGET HIT";
          } else {
            exitPrice = next.close;
            outcome = "EOD EXIT";
          }
        }

        const riskPerShare = Math.max(Math.abs(entryPrice - stopLoss), 0.1);
        const maxRiskAmount = currentBalance * (riskPct / 100);
        const shares = Math.max(Math.floor(maxRiskAmount / riskPerShare), 1);

        const diff = action === "BUY" ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
        const pnl = Math.round(diff * shares * 100) / 100;

        currentBalance += pnl;
        if (currentBalance > peakBalance) peakBalance = currentBalance;
        const dd = ((peakBalance - currentBalance) / peakBalance) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        trades.push({
          date: c.time,
          symbol,
          action,
          entryPrice: Math.round(entryPrice * 100) / 100,
          exitPrice: Math.round(exitPrice * 100) / 100,
          shares,
          pnl,
          outcome,
          balance: Math.round(currentBalance * 100) / 100
        });
      }
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
    const totalGains = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? Math.round((totalGains / totalLosses) * 100) / 100 : (totalGains > 0 ? 99 : 0);

    const avgWin = wins.length > 0 ? totalGains / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const expectancy = Math.round(((winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss) * 100) / 100;

    return {
      symbol,
      strategyType,
      tradesCount: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      profitFactor,
      expectancy,
      netPnL: Math.round((currentBalance - capital) * 100) / 100,
      finalBalance: Math.round(currentBalance * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdown * 10) / 10,
      trades: trades.slice(-10)
    };
  }
};

if (typeof window !== "undefined") {
  window.StrategyBacktester = StrategyBacktester;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = StrategyBacktester;
}
