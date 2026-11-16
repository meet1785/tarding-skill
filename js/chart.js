/**
 * TradeMind AI - Interactive Live Chart Studio (Institutional v3)
 * Powered by TradingView Lightweight Charts (with universal v4/v5 compatibility & Canvas fallback):
 * - Candlestick & Volume Profile
 * - Institutional Purple VWAP Line + Standard Deviation Envelope
 * - Supertrend (10, 3) Trend Indicator
 * - 15-Minute Opening Range (ORB) High & Low Boundaries
 * - Dynamic Entry, Stop-Loss, and Target Price Lines
 * - Multi-Timeframe Switching (1D, 15m, 5m, 1m)
 * - Live Micro-Tick Streaming Updates
 */

class ChartStudio {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.vwapSeries = null;
    this.vwapUpperSeries = null;
    this.vwapLowerSeries = null;
    this.supertrendSeries = null;
    this.ema9Series = null;
    this.ema21Series = null;
    this.activeSymbol = "PNB";
    this.currentTimeframe = "1D";
    this.currentCandles = [];
    this.priceLines = [];
    this.isFallbackMode = false;
    this.visibleIndicators = {
      vwap: true,
      bands: true,
      supertrend: true,
      ema9: false,
      ema21: false,
      volume: true
    };
  }

  // Universal Series Factory (supports both Lightweight Charts v4 and v5)
  createSeries(type, options) {
    if (!this.chart) return null;

    // 1. Lightweight Charts v4 API
    if (type === "Candlestick" && typeof this.chart.addCandlestickSeries === "function") {
      return this.chart.addCandlestickSeries(options);
    }
    if (type === "Histogram" && typeof this.chart.addHistogramSeries === "function") {
      return this.chart.addHistogramSeries(options);
    }
    if (type === "Line" && typeof this.chart.addLineSeries === "function") {
      return this.chart.addLineSeries(options);
    }

    // 2. Lightweight Charts v5+ API (addSeries with Series Definition)
    if (typeof this.chart.addSeries === "function" && typeof LightweightCharts !== "undefined") {
      if (type === "Candlestick" && LightweightCharts.CandlestickSeries) {
        return this.chart.addSeries(LightweightCharts.CandlestickSeries, options);
      }
      if (type === "Histogram" && LightweightCharts.HistogramSeries) {
        return this.chart.addSeries(LightweightCharts.HistogramSeries, options);
      }
      if (type === "Line" && LightweightCharts.LineSeries) {
        return this.chart.addSeries(LightweightCharts.LineSeries, options);
      }
      if (LightweightCharts[type + "Series"]) {
        return this.chart.addSeries(LightweightCharts[type + "Series"], options);
      }
    }

    console.warn(`Could not create series of type ${type}`);
    return null;
  }

  init() {
    this.container = document.getElementById(this.containerId) || this.container;
    if (!this.container) {
      console.warn("Chart container not found.");
      return;
    }

    // Check if LightweightCharts library is loaded
    if (typeof LightweightCharts === "undefined") {
      console.warn("LightweightCharts library not loaded. Falling back to native canvas renderer.");
      this.isFallbackMode = true;
      this.renderFallbackChart();
      return;
    }

    this.container.innerHTML = "";
    this.isFallbackMode = false;

    // Handle initial zero-width when initialized inside hidden tab
    let width = this.container.clientWidth;
    if (!width || width < 100) {
      width = this.container.parentElement ? this.container.parentElement.clientWidth : 860;
      if (!width || width < 100) width = 860;
    }

    let height = this.container.clientHeight;
    if (!height || height < 200) {
      height = 520;
    }

    try {
      this.chart = LightweightCharts.createChart(this.container, {
        width: Math.floor(width),
        height: Math.floor(height),
        layout: {
          background: { color: "#0f172a" },
          textColor: "#94a3b8",
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace"
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.04)" },
          horzLines: { color: "rgba(255, 255, 255, 0.04)" }
        },
        crosshair: {
          mode: (LightweightCharts.CrosshairMode && LightweightCharts.CrosshairMode.Normal) !== undefined 
            ? LightweightCharts.CrosshairMode.Normal 
            : 0,
          vertLine: { color: "#38bdf8", width: 1, style: 2 },
          horzLine: { color: "#38bdf8", width: 1, style: 2 }
        },
        rightPriceScale: {
          borderColor: "#223049"
        },
        timeScale: {
          borderColor: "#223049",
          timeVisible: true,
          secondsVisible: false
        }
      });

      // Candlestick Series
      this.candleSeries = this.createSeries("Candlestick", {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444"
      });

      // Volume Series
      this.volumeSeries = this.createSeries("Histogram", {
        color: "#3b82f6",
        priceFormat: { type: "volume" },
        priceScaleId: "",
        scaleMargins: {
          top: 0.82,
          bottom: 0
        }
      });

      // Institutional VWAP Line (Purple)
      this.vwapSeries = this.createSeries("Line", {
        color: "#a855f7",
        lineWidth: 2,
        title: "VWAP Anchor"
      });

      // VWAP Bands (Upper & Lower 1.5 sigma)
      this.vwapUpperSeries = this.createSeries("Line", {
        color: "rgba(168, 85, 247, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        title: "VWAP Upper Band"
      });

      this.vwapLowerSeries = this.createSeries("Line", {
        color: "rgba(168, 85, 247, 0.4)",
        lineWidth: 1,
        lineStyle: 2,
        title: "VWAP Lower Band"
      });

      // Supertrend (10, 3) Line
      this.supertrendSeries = this.createSeries("Line", {
        color: "#10b981",
        lineWidth: 2,
        title: "Supertrend (10,3)"
      });

      // EMA 9 & EMA 21
      this.ema9Series = this.createSeries("Line", {
        color: "#06b6d4",
        lineWidth: 1.5,
        title: "EMA 9"
      });
      if (this.ema9Series && this.ema9Series.applyOptions) {
        this.ema9Series.applyOptions({ visible: this.visibleIndicators.ema9 });
      }

      this.ema21Series = this.createSeries("Line", {
        color: "#f59e0b",
        lineWidth: 1.5,
        title: "EMA 21"
      });
      if (this.ema21Series && this.ema21Series.applyOptions) {
        this.ema21Series.applyOptions({ visible: this.visibleIndicators.ema21 });
      }

      // Responsive Resize
      window.addEventListener("resize", () => this.resize());

      // Subscribe to live market updates
      if (window.MarketData && typeof window.MarketData.subscribe === "function") {
        window.MarketData.subscribe((sym, quote) => {
          if (sym === this.activeSymbol && this.candleSeries) {
            this.updateLatestTick(quote.price);
          }
        });
      }

      // Load initial stock
      this.loadSymbol(this.activeSymbol, this.currentTimeframe);
    } catch (err) {
      console.error("Failed to initialize Lightweight Charts:", err);
      this.isFallbackMode = true;
      this.renderFallbackChart();
    }
  }

  resize() {
    if (this.chart && this.container) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight || 520;
      if (w > 50) {
        this.chart.applyOptions({ width: Math.floor(w), height: Math.floor(h) });
        if (this.chart.timeScale) {
          this.chart.timeScale().fitContent();
        }
      }
    } else if (this.isFallbackMode) {
      this.renderFallbackChart();
    }
  }

  setTimeframe(tf) {
    this.currentTimeframe = tf;
    this.loadSymbol(this.activeSymbol, tf);
  }

  loadSymbol(symbol, timeframe = this.currentTimeframe) {
    this.activeSymbol = symbol;
    this.currentTimeframe = timeframe;

    if (!window.MarketData) return;
    const candles = window.MarketData.getCandles(symbol, 60, timeframe);
    this.currentCandles = candles;

    if (this.isFallbackMode || !this.chart || !this.candleSeries) {
      if (typeof LightweightCharts !== "undefined" && !this.chart) {
        this.init();
      } else {
        this.renderFallbackChart();
        return;
      }
    }

    if (!this.candleSeries) return;

    const formattedCandles = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const formattedVolume = candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"
    }));

    try {
      this.candleSeries.setData(formattedCandles);
      if (this.volumeSeries) {
        this.volumeSeries.setData(formattedVolume);
      }

      // Calculate & plot VWAP and Bands
      const vwapData = window.Indicators.calculateVWAP(candles);
      if (this.vwapSeries && vwapData.vwap) {
        this.vwapSeries.setData(candles.map((c, i) => ({ time: c.time, value: vwapData.vwap[i] })));
      }
      if (this.vwapUpperSeries && vwapData.upperBand) {
        this.vwapUpperSeries.setData(candles.map((c, i) => ({ time: c.time, value: vwapData.upperBand[i] })));
      }
      if (this.vwapLowerSeries && vwapData.lowerBand) {
        this.vwapLowerSeries.setData(candles.map((c, i) => ({ time: c.time, value: vwapData.lowerBand[i] })));
      }

      // Calculate & plot Supertrend (10, 3)
      const stData = window.Indicators.calculateSupertrend(candles, 10, 3);
      if (this.supertrendSeries && stData.supertrend) {
        const formattedSt = [];
        candles.forEach((c, i) => {
          if (stData.supertrend[i] !== null) {
            formattedSt.push({ time: c.time, value: stData.supertrend[i] });
          }
        });
        this.supertrendSeries.setData(formattedSt);
        const currentDir = stData.direction ? stData.direction[stData.direction.length - 1] : 1;
        this.supertrendSeries.applyOptions({
          color: currentDir === 1 ? "#10b981" : "#ef4444"
        });
      }

      // Calculate & plot EMAs
      const ema9 = window.Indicators.calculateEMA(candles, 9);
      const ema21 = window.Indicators.calculateEMA(candles, 21);
      if (this.ema9Series && ema9) {
        const formattedEma9 = [];
        candles.forEach((c, i) => {
          if (ema9[i] !== null) formattedEma9.push({ time: c.time, value: ema9[i] });
        });
        this.ema9Series.setData(formattedEma9);
      }
      if (this.ema21Series && ema21) {
        const formattedEma21 = [];
        candles.forEach((c, i) => {
          if (ema21[i] !== null) formattedEma21.push({ time: c.time, value: ema21[i] });
        });
        this.ema21Series.setData(formattedEma21);
      }

      // Auto-fit visible data in viewport
      if (this.chart && this.chart.timeScale) {
        this.chart.timeScale().fitContent();
      }

      // Opening Range & Setup Lines
      const orb = window.Indicators.calculateOpeningRange(candles, 3);
      const currentVwap = vwapData.vwap ? vwapData.vwap[vwapData.vwap.length - 1] : candles[candles.length - 1].close;
      const currentSt = stData.supertrend ? stData.supertrend[stData.supertrend.length - 1] : currentVwap;
      const currentDir = stData.direction ? stData.direction[stData.direction.length - 1] : 1;

      this.drawSetupLines(symbol, candles, currentVwap, currentSt, orb);
      this.updateDossier(symbol, candles, currentVwap, currentSt, currentDir, orb);
    } catch (err) {
      console.error("Error setting series data:", err);
    }
  }

  updateLatestTick(price) {
    if (!this.candleSeries || this.currentCandles.length === 0) return;
    const stock = window.MarketData.stocks[this.activeSymbol];
    if (!stock) return;

    const lastCandle = this.currentCandles[this.currentCandles.length - 1];
    try {
      this.candleSeries.update({
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, price),
        low: Math.min(lastCandle.low, price),
        close: price
      });
    } catch (e) {
      console.warn("Tick update warning:", e);
    }
  }

  drawSetupLines(symbol, candles, currentVwap, currentSt, orb) {
    if (!this.candleSeries) return;

    // Safely remove previous lines
    this.priceLines.forEach(line => {
      try {
        if (this.candleSeries.removePriceLine) {
          this.candleSeries.removePriceLine(line);
        }
      } catch (e) {
        // ignore
      }
    });
    this.priceLines = [];

    const stock = window.MarketData.stocks[symbol];
    if (!stock) return;

    const ltp = stock.price;
    const atr = stock.atr || 3.0;

    const plannedEntry = currentVwap ? Math.round(currentVwap * 100) / 100 : ltp;
    const stopPrice = Math.round((Math.min(currentVwap, currentSt || currentVwap) - 0.4 * atr) * 100) / 100;
    const target1Price = Math.round((plannedEntry + 1.8 * Math.max(plannedEntry - stopPrice, 0.4)) * 100) / 100;

    try {
      if (this.candleSeries.createPriceLine) {
        const entryLine = this.candleSeries.createPriceLine({
          price: plannedEntry,
          color: "#38bdf8",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: "VWAP ENTRY: ₹" + plannedEntry
        });

        const stopLine = this.candleSeries.createPriceLine({
          price: stopPrice,
          color: "#ef4444",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "HARD STOP: ₹" + stopPrice
        });

        const targetLine = this.candleSeries.createPriceLine({
          price: target1Price,
          color: "#10b981",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "TARGET 1 (1:2 R:R): ₹" + target1Price
        });

        if (orb && orb.high > 0) {
          const orbHighLine = this.candleSeries.createPriceLine({
            price: orb.high,
            color: "rgba(245, 158, 11, 0.6)",
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: "ORB HIGH (9:30 AM): ₹" + orb.high
          });
          this.priceLines.push(orbHighLine);
        }

        this.priceLines.push(entryLine, stopLine, targetLine);
      }
    } catch (e) {
      console.warn("Price lines warning:", e);
    }
  }

  updateDossier(symbol, candles, currentVwap, currentSt, currentDir, orb) {
    const stock = window.MarketData.stocks[symbol];
    if (!stock) return;

    const high = Math.max(...candles.map(c => c.high));
    const low = Math.min(...candles.map(c => c.low));
    const fib = window.Indicators.calculateFibonacci(high, low);

    const dossierSym = document.getElementById("dossierSymbol");
    if (dossierSym) dossierSym.innerText = `${stock.symbol} (${stock.name})`;

    const dossierRsi = document.getElementById("dossierRsi");
    if (dossierRsi) dossierRsi.innerText = stock.rsi;

    const dossierAtr = document.getElementById("dossierAtr");
    if (dossierAtr) dossierAtr.innerText = "₹" + stock.atr;

    const dossierVwap = document.getElementById("dossierVwap");
    if (dossierVwap && currentVwap) {
      const diff = Math.round((stock.price - currentVwap) * 100) / 100;
      const diffPct = Math.round((diff / currentVwap) * 10000) / 100;
      dossierVwap.innerHTML = `₹${currentVwap.toFixed(2)} <span style="font-size:0.75rem; color:${diff >= 0 ? '#10b981' : '#ef4444'}">(${diff >= 0 ? '+' : ''}${diffPct}%)</span>`;
    }

    const dossierSt = document.getElementById("dossierSupertrend");
    if (dossierSt && currentSt) {
      dossierSt.innerHTML = `<span style="color:${currentDir === 1 ? '#10b981' : '#ef4444'}; font-weight:700;">₹${currentSt.toFixed(2)} (${currentDir === 1 ? 'BULLISH' : 'BEARISH'})</span>`;
    }

    const dossierOrb = document.getElementById("dossierOrb");
    if (dossierOrb && orb) {
      dossierOrb.innerText = `₹${orb.low.toFixed(2)} - ₹${orb.high.toFixed(2)}`;
    }

    const fibBody = document.getElementById("fibTableBody");
    if (fibBody) {
      fibBody.innerHTML = Object.entries(fib.levels)
        .map(([lvl, prc]) => `<tr><td style="color:#94a3b8;">${lvl}</td><td style="color:${prc >= stock.price ? '#10b981' : '#f59e0b'}; font-weight:600;">₹${prc.toFixed(2)}</td></tr>`)
        .join("");
    }
  }

  toggleIndicator(name) {
    if (!this.visibleIndicators) return;

    if (name === "vwap" && this.vwapSeries) {
      this.visibleIndicators.vwap = !this.visibleIndicators.vwap;
      this.vwapSeries.applyOptions({ visible: this.visibleIndicators.vwap });
    } else if (name === "bands") {
      this.visibleIndicators.bands = !this.visibleIndicators.bands;
      if (this.vwapUpperSeries) this.vwapUpperSeries.applyOptions({ visible: this.visibleIndicators.bands });
      if (this.vwapLowerSeries) this.vwapLowerSeries.applyOptions({ visible: this.visibleIndicators.bands });
    } else if (name === "supertrend" && this.supertrendSeries) {
      this.visibleIndicators.supertrend = !this.visibleIndicators.supertrend;
      this.supertrendSeries.applyOptions({ visible: this.visibleIndicators.supertrend });
    } else if (name === "ema9" && this.ema9Series) {
      this.visibleIndicators.ema9 = !this.visibleIndicators.ema9;
      this.ema9Series.applyOptions({ visible: this.visibleIndicators.ema9 });
    } else if (name === "ema21" && this.ema21Series) {
      this.visibleIndicators.ema21 = !this.visibleIndicators.ema21;
      this.ema21Series.applyOptions({ visible: this.visibleIndicators.ema21 });
    }
  }

  // Native HTML5 Canvas Fallback Renderer (guarantees chart visibility even offline)
  renderFallbackChart() {
    this.container = document.getElementById(this.containerId) || this.container;
    if (!this.container) return;

    const stock = window.MarketData.stocks[this.activeSymbol] || window.MarketData.stocks.PNB;
    const candles = window.MarketData.getCandles(this.activeSymbol, 50, this.currentTimeframe);
    const vwapData = window.Indicators.calculateVWAP(candles);
    const stData = window.Indicators.calculateSupertrend(candles, 10, 3);
    const orb = window.Indicators.calculateOpeningRange(candles, 3);
    const currentVwap = vwapData.vwap[vwapData.vwap.length - 1];
    const currentSt = stData.supertrend[stData.supertrend.length - 1];
    const currentDir = stData.direction[stData.direction.length - 1];

    this.container.innerHTML = `
      <canvas id="fallbackCanvas" style="width:100%; height:100%; min-height:480px; display:block; border-radius:8px;"></canvas>
    `;

    const canvas = document.getElementById("fallbackCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = (canvas.width = this.container.clientWidth || 860);
    const height = (canvas.height = this.container.clientHeight || 520);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 40; y < height - 30; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const minP = Math.min(...candles.map(c => c.low)) * 0.995;
    const maxP = Math.max(...candles.map(c => c.high)) * 1.005;
    const pRange = maxP - minP || 1;

    const toY = (p) => height - 40 - ((p - minP) / pRange) * (height - 80);
    const candleWidth = Math.max(3, (width - 80) / candles.length - 2);

    // Draw Candlesticks
    candles.forEach((c, i) => {
      const x = 30 + i * (candleWidth + 2);
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? "#10b981" : "#ef4444";
      ctx.strokeStyle = isUp ? "#10b981" : "#ef4444";

      // Wick
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, toY(c.high));
      ctx.lineTo(x + candleWidth / 2, toY(c.low));
      ctx.stroke();

      // Body
      const yOpen = toY(c.open);
      const yClose = toY(c.close);
      const top = Math.min(yOpen, yClose);
      const h = Math.max(Math.abs(yClose - yOpen), 2);
      ctx.fillRect(x, top, candleWidth, h);
    });

    // Draw VWAP line
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = 30 + i * (candleWidth + 2) + candleWidth / 2;
      const y = toY(vwapData.vwap[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Chart Header Overlay
    ctx.fillStyle = "#a855f7";
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(`VWAP: ₹${currentVwap.toFixed(2)}`, 25, 25);
    ctx.fillStyle = currentDir === 1 ? "#10b981" : "#ef4444";
    ctx.fillText(`Supertrend (10,3): ₹${currentSt.toFixed(2)}`, 160, 25);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`${stock.symbol} ₹${stock.price.toFixed(2)}`, 360, 25);

    this.updateDossier(this.activeSymbol, candles, currentVwap, currentSt, currentDir, orb);
  }
}

if (typeof window !== "undefined") {
  window.ChartStudio = ChartStudio;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChartStudio;
}
