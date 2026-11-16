/**
 * TradeMind AI - Quantitative Technical Indicator Engine (Institutional Upgrade v3)
 * Implements:
 * - VWAP & Multi-sigma Standard Deviation Bands
 * - Supertrend (10, 3) Institutional Trend Filter
 * - 15-Minute Opening Range (ORB) High & Low
 * - Liquidity Trap & Morning Fakeout Detector
 * - Multi-Factor Institutional Confluence Score (0 - 100%)
 * - NSE Real Brokerage, STT, and Regulatory Charges Calculator
 * - Strict Capital Risk Sizing for ₹1,000 Accounts
 */

const Indicators = {
  // Volume Weighted Average Price (VWAP) & Standard Deviation Bands
  calculateVWAP(data) {
    let cumVol = 0;
    let cumVolPrice = 0;
    const vwap = [];
    const varianceArr = [];

    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumVol += c.volume;
      cumVolPrice += typicalPrice * c.volume;

      const currentVwap = cumVol === 0 ? typicalPrice : cumVolPrice / cumVol;
      vwap.push(Math.round(currentVwap * 100) / 100);

      const diff = typicalPrice - currentVwap;
      varianceArr.push(diff * diff);
    }

    const upperBand = [];
    const lowerBand = [];
    for (let i = 0; i < vwap.length; i++) {
      const slice = varianceArr.slice(0, i + 1);
      const stdDev = Math.sqrt(slice.reduce((a, b) => a + b, 0) / (i + 1));
      upperBand.push(Math.round((vwap[i] + 1.5 * stdDev) * 100) / 100);
      lowerBand.push(Math.round((vwap[i] - 1.5 * stdDev) * 100) / 100);
    }

    return { vwap, upperBand, lowerBand };
  },

  // Simple Moving Average
  calculateSMA(data, period = 20) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        sma.push(Math.round((sum / period) * 100) / 100);
      }
    }
    return sma;
  },

  // Exponential Moving Average
  calculateEMA(data, period = 9) {
    const k = 2 / (period + 1);
    const ema = [];
    let prevEma = null;

    for (let i = 0; i < data.length; i++) {
      const price = data[i].close;
      if (i < period - 1) {
        ema.push(null);
      } else if (i === period - 1) {
        const slice = data.slice(0, period);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        prevEma = sum / period;
        ema.push(Math.round(prevEma * 100) / 100);
      } else {
        prevEma = price * k + prevEma * (1 - k);
        ema.push(Math.round(prevEma * 100) / 100);
      }
    }
    return ema;
  },

  // Relative Strength Index (14)
  calculateRSI(data, period = 14) {
    const rsi = [];
    let gains = [];
    let losses = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        rsi.push(null);
        continue;
      }
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);

      if (i < period) {
        rsi.push(null);
      } else if (i === period) {
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
      } else {
        const prevAvgGain = gains[gains.length - 2];
        const prevAvgLoss = losses[losses.length - 2];
        const currentGain = gains[gains.length - 1];
        const currentLoss = losses[losses.length - 1];

        const avgGain = (prevAvgGain * (period - 1) + currentGain) / period;
        const avgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
      }
    }
    return rsi;
  },

  // Average True Range (14)
  calculateATR(data, period = 14) {
    const tr = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        tr.push(data[i].high - data[i].low);
      } else {
        const hL = data[i].high - data[i].low;
        const hC = Math.abs(data[i].high - data[i - 1].close);
        const lC = Math.abs(data[i].low - data[i - 1].close);
        tr.push(Math.max(hL, hC, lC));
      }
    }

    const atr = [];
    let prevAtr = 0;
    for (let i = 0; i < tr.length; i++) {
      if (i < period - 1) {
        atr.push(null);
      } else if (i === period - 1) {
        prevAtr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
        atr.push(Math.round(prevAtr * 100) / 100);
      } else {
        prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
        atr.push(Math.round(prevAtr * 100) / 100);
      }
    }
    return atr;
  },

  // Supertrend (Period 10, Multiplier 3)
  calculateSupertrend(data, period = 10, multiplier = 3) {
    const atr = this.calculateATR(data, period);
    const supertrend = [];
    const direction = []; // 1 = Bullish (Green), -1 = Bearish (Red)
    let finalUpper = 0;
    let finalLower = 0;
    let currentDir = 1;

    for (let i = 0; i < data.length; i++) {
      if (atr[i] === null) {
        supertrend.push(null);
        direction.push(null);
        continue;
      }

      const hl2 = (data[i].high + data[i].low) / 2;
      let basicUpper = hl2 + (multiplier * atr[i]);
      let basicLower = hl2 - (multiplier * atr[i]);

      if (i > 0 && atr[i - 1] !== null) {
        const prevClose = data[i - 1].close;
        finalUpper = (basicUpper < finalUpper || prevClose > finalUpper) ? basicUpper : finalUpper;
        finalLower = (basicLower > finalLower || prevClose < finalLower) ? basicLower : finalLower;
      } else {
        finalUpper = basicUpper;
        finalLower = basicLower;
      }

      const close = data[i].close;
      if (currentDir === 1) {
        if (close < finalLower) {
          currentDir = -1;
          supertrend.push(Math.round(finalUpper * 100) / 100);
        } else {
          supertrend.push(Math.round(finalLower * 100) / 100);
        }
      } else {
        if (close > finalUpper) {
          currentDir = 1;
          supertrend.push(Math.round(finalLower * 100) / 100);
        } else {
          supertrend.push(Math.round(finalUpper * 100) / 100);
        }
      }
      direction.push(currentDir);
    }

    return { supertrend, direction };
  },

  // 15-Minute Opening Range (First 3 x 5-minute candles: 9:15 - 9:30 AM)
  calculateOpeningRange(data, candleCount = 3) {
    const rangeData = data.slice(0, Math.min(candleCount, data.length));
    if (rangeData.length === 0) return { high: 0, low: 0, midpoint: 0 };

    const high = Math.max(...rangeData.map(c => c.high));
    const low = Math.min(...rangeData.map(c => c.low));
    const midpoint = Math.round(((high + low) / 2) * 100) / 100;

    return {
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      midpoint
    };
  },

  // Bollinger Bands (20, 2)
  calculateBollingerBands(data, period = 20, multiplier = 2) {
    const sma = this.calculateSMA(data, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < data.length; i++) {
      if (sma[i] === null) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        upper.push(Math.round((mean + multiplier * stdDev) * 100) / 100);
        lower.push(Math.round((mean - multiplier * stdDev) * 100) / 100);
      }
    }
    return { middle: sma, upper, lower };
  },

  // Fibonacci Retracements & Extensions
  calculateFibonacci(high, low) {
    const diff = high - low;
    return {
      swingHigh: high,
      swingLow: low,
      levels: {
        "0.0% Low": low,
        "23.6% Pullback": Math.round((high - diff * 0.236) * 100) / 100,
        "38.2% Retracement": Math.round((high - diff * 0.382) * 100) / 100,
        "50.0% Equilibrium": Math.round((high - diff * 0.500) * 100) / 100,
        "61.8% Golden Pocket": Math.round((high - diff * 0.618) * 100) / 100,
        "78.6% Deep Support": Math.round((high - diff * 0.786) * 100) / 100,
        "100.0% High": high,
        "127.2% Target Extension": Math.round((high + diff * 0.272) * 100) / 100,
        "161.8% Golden Extension": Math.round((high + diff * 0.618) * 100) / 100
      }
    };
  },

  // Liquidity Trap & Fakeout Detector
  detectLiquidityTrap(ltp, vwap, rsi, dayOpen, dayHigh) {
    const vwapDistPct = ((ltp - vwap) / vwap) * 100;
    const isExtendedFromVWAP = vwapDistPct > 1.4;
    const isOverbought = rsi >= 75;
    const isFadingHigh = (dayHigh - ltp) > (dayHigh - dayOpen) * 0.4 && ltp < dayHigh;

    const reasons = [];
    if (isExtendedFromVWAP) reasons.push("Stretched +" + vwapDistPct.toFixed(1) + "% from VWAP");
    if (isOverbought) reasons.push("Overbought RSI (" + rsi + ")");
    if (isFadingHigh) reasons.push("Failed breakout fading off HOD");

    if (isExtendedFromVWAP && isOverbought) {
      return {
        isTrap: true,
        type: "OVEREXTENDED_BREAKOUT_TRAP",
        severity: "HIGH",
        reasons,
        message: "⚠️ DO NOT BUY BREAKOUT: Price is stretched " + vwapDistPct.toFixed(1) + "% above VWAP with RSI at " + rsi + ". High probability of institutional distribution into retail morning volume."
      };
    }

    if (ltp < vwap && isFadingHigh) {
      return {
        isTrap: true,
        type: "FAILED_ORB_REVERSAL",
        severity: "CRITICAL",
        reasons,
        message: "⚠️ BEARISH REGIME: Price broke below VWAP after failing to hold the morning surge. Long trades are disqualified."
      };
    }

    return {
      isTrap: false,
      type: "CLEAN_STRUCTURE",
      severity: "LOW",
      reasons: ["Clean VWAP re-test", "RSI within healthy limits"],
      message: "✓ Structure valid. Price trading near VWAP value zone."
    };
  },

  // Multi-Factor Institutional Confluence Score (0 - 100%)
  calculateConfluenceScore(stock, ltp, vwap, supertrendDir, rsi, volume, avgVolume, orb) {
    let score = 0;
    const checklist = [];

    // Factor 1: VWAP Alignment (25 Points)
    if (ltp >= vwap) {
      score += 25;
      checklist.push({ label: "VWAP Bias", passed: true, detail: "Price (₹" + ltp.toFixed(2) + ") > VWAP (₹" + vwap.toFixed(2) + ")" });
    } else {
      checklist.push({ label: "VWAP Bias", passed: false, detail: "Price below VWAP (bearish institutional zone)" });
    }

    // Factor 2: Supertrend Direction (25 Points)
    if (supertrendDir === 1) {
      score += 25;
      checklist.push({ label: "Supertrend (10,3)", passed: true, detail: "Bullish Green trend active" });
    } else {
      checklist.push({ label: "Supertrend (10,3)", passed: false, detail: "Bearish Red trend active" });
    }

    // Factor 3: Volume Surge (20 Points)
    const volRatio = avgVolume > 0 ? volume / avgVolume : 1;
    if (volRatio >= 1.25) {
      score += 20;
      checklist.push({ label: "Volume Expansion", passed: true, detail: volRatio.toFixed(1) + "x 20-period moving average" });
    } else if (volRatio >= 1.0) {
      score += 10;
      checklist.push({ label: "Volume Expansion", passed: true, detail: "Normal volume (" + volRatio.toFixed(1) + "x avg)" });
    } else {
      checklist.push({ label: "Volume Expansion", passed: false, detail: "Low volume (" + volRatio.toFixed(1) + "x avg) - lacks smart money participation" });
    }

    // Factor 4: Healthy Momentum RSI (15 Points)
    if (rsi >= 45 && rsi <= 68) {
      score += 15;
      checklist.push({ label: "RSI Zone (14)", passed: true, detail: "Optimal momentum (" + rsi + ")" });
    } else if (rsi > 75) {
      score -= 20; // Severe penalty for chasing top
      checklist.push({ label: "RSI Zone (14)", passed: false, detail: "EXTREME OVERBOUGHT (" + rsi + ") - Trap risk" });
    } else {
      score += 5;
      checklist.push({ label: "RSI Zone (14)", passed: true, detail: "Neutral RSI (" + rsi + ")" });
    }

    // Factor 5: Opening Range (15-min) Position (15 Points)
    if (orb && orb.high > 0) {
      if (ltp >= orb.high) {
        score += 15;
        checklist.push({ label: "Opening Range", passed: true, detail: "Trading above 15-min Opening Range High (₹" + orb.high.toFixed(2) + ")" });
      } else if (ltp >= orb.midpoint) {
        score += 10;
        checklist.push({ label: "Opening Range", passed: true, detail: "Above Opening Range Midpoint (₹" + orb.midpoint.toFixed(2) + ")" });
      } else {
        checklist.push({ label: "Opening Range", passed: false, detail: "Below Opening Range Midpoint (Weakness)" });
      }
    }

    // Trap Penalty Check
    const trap = this.detectLiquidityTrap(ltp, vwap, rsi, stock.open, stock.high);
    if (trap.isTrap) {
      score = Math.max(score - 40, 10);
    }

    score = Math.min(Math.max(score, 0), 100);

    let grade = "C";
    let statusText = "AVOID / CHOP";
    if (score >= 85) {
      grade = "A+";
      statusText = "INSTITUTIONAL CONFLUENCE";
    } else if (score >= 70) {
      grade = "B+";
      statusText = "VALID SETUP";
    } else if (score >= 50) {
      grade = "C";
      statusText = "NEUTRAL / MODERATE";
    } else {
      grade = "F";
      statusText = "LIQUIDITY TRAP / AVOID";
    }

    return { score, grade, statusText, checklist, isTrap: trap.isTrap };
  },

  // Realistic NSE Brokerage, STT, and Regulatory Charges Calculator
  calculateNSEBrokerageAndTaxes(buyPrice, sellPrice, quantity) {
    const buyTurnover = buyPrice * quantity;
    const sellTurnover = sellPrice * quantity;
    const totalTurnover = buyTurnover + sellTurnover;

    // 1. Brokerage (e.g. Zerodha/Groww: ₹20 per executed order or 0.05%, whichever is lower)
    const buyBrokerage = Math.min(20, buyTurnover * 0.0005);
    const sellBrokerage = Math.min(20, sellTurnover * 0.0005);
    const totalBrokerage = buyBrokerage + sellBrokerage;

    // 2. Securities Transaction Tax (STT) - 0.025% on Intraday Sell side
    const stt = sellTurnover * 0.00025;

    // 3. Exchange Transaction Charges - 0.00345% of total turnover on NSE
    const exchangeCharges = totalTurnover * 0.0000345;

    // 4. SEBI Turnover Charges - 0.0001% (₹10 per crore)
    const sebiCharges = totalTurnover * 0.000001;

    // 5. Stamp Duty - 0.003% on Buy turnover
    const stampDuty = buyTurnover * 0.00003;

    // 6. GST - 18% on (Brokerage + Exchange Charges + SEBI Charges)
    const gst = (totalBrokerage + exchangeCharges + sebiCharges) * 0.18;

    const totalTaxesAndCharges = Math.round((totalBrokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst) * 100) / 100;
    const grossPnL = Math.round((sellTurnover - buyTurnover) * 100) / 100;
    const netPnL = Math.round((grossPnL - totalTaxesAndCharges) * 100) / 100;

    return {
      buyTurnover: Math.round(buyTurnover * 100) / 100,
      sellTurnover: Math.round(sellTurnover * 100) / 100,
      totalTurnover: Math.round(totalTurnover * 100) / 100,
      brokerage: Math.round(totalBrokerage * 100) / 100,
      stt: Math.round(stt * 100) / 100,
      exchangeCharges: Math.round(exchangeCharges * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      stampDuty: Math.round(stampDuty * 100) / 100,
      totalTaxesAndCharges,
      grossPnL,
      netPnL
    };
  },

  // Professional Position Sizing for Indian Market (INR)
  calculatePositionSize(capital, riskPct, entryPrice, stopLossPrice, leverage = 5) {
    const riskAmount = capital * (riskPct / 100);
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);

    if (riskPerShare <= 0) {
      return { shares: 0, riskAmount: 0, riskPerShare: 0, totalTradeValue: 0, marginRequired: 0, allocationPct: 0, leverageUsed: leverage };
    }

    let shares = Math.floor(riskAmount / riskPerShare);
    const maxBuyingPower = capital * leverage;
    const maxSharesAllowed = Math.floor(maxBuyingPower / entryPrice);

    shares = Math.min(shares, maxSharesAllowed);
    shares = Math.max(shares, 1);

    const totalTradeValue = Math.round(shares * entryPrice * 100) / 100;
    const marginRequired = Math.round((totalTradeValue / leverage) * 100) / 100;

    return {
      shares,
      riskAmount: Math.round(shares * riskPerShare * 100) / 100,
      riskPerShare: Math.round(riskPerShare * 100) / 100,
      totalTradeValue,
      marginRequired,
      allocationPct: Math.round((marginRequired / capital) * 10000) / 100,
      leverageUsed: leverage
    };
  }
};

window.Indicators = Indicators;
