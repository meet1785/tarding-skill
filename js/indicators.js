/**
 * TradeMind AI - Quantitative Technical Indicator Engine (Institutional Upgrade)
 * Calculates VWAP, VWAP Bands, RSI, ATR, Moving Averages, Bollinger Bands, MACD, Fibonacci,
 * and Strict Capital Sizing based on Professional Institutional Quant Rules.
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

      // Variance from VWAP for standard deviation bands
      const diff = typicalPrice - currentVwap;
      varianceArr.push(diff * diff);
    }

    // Upper and Lower VWAP 1.5-sigma bands
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

    if (isExtendedFromVWAP && isOverbought) {
      return {
        isTrap: true,
        type: "OVEREXTENDED_BREAKOUT_TRAP",
        severity: "HIGH",
        message: "⚠️ DO NOT BUY BREAKOUT: Price is stretched " + vwapDistPct.toFixed(1) + "% above VWAP with RSI at " + rsi + ". High probability of institutional distribution into retail morning volume."
      };
    }

    if (ltp < vwap && isFadingHigh) {
      return {
        isTrap: true,
        type: "FAILED_ORB_REVERSAL",
        severity: "CRITICAL",
        message: "⚠️ BEARISH REGIME: Price broke below VWAP after failing to hold the morning surge. Long trades are disqualified."
      };
    }

    return {
      isTrap: false,
      type: "CLEAN_STRUCTURE",
      severity: "LOW",
      message: "✓ Structure valid. Price trading near VWAP value zone."
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
