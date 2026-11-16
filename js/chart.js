/**
 * TradeMind AI - Interactive Live Chart Studio (Institutional v3)
 * Powered by TradingView Lightweight Charts with:
 * - Candlestick & Volume Profile
 * - Institutional Purple VWAP Line + Standard Deviation Envelope
 * - Supertrend (10, 3) Trend Indicator
 * - 15-Minute Opening Range (ORB) High & Low Boundaries
 * - Dynamic Entry, Stop-Loss, and Target Price Lines
 * - Live Micro-Tick Streaming Updates
 */

class ChartStudio {
  constructor(containerId) {
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
    this.priceLines = [];
    this.visibleIndicators = {
      vwap: true,
      bands: true,
      supertrend: true,
      ema9: false,
      ema21: false,
      volume: true
    };
  }

  init() {
    if (!this.container || typeof LightweightCharts === "undefined") {
      console.warn("Chart container or LightweightCharts not found.");
      return;
    }

    this.container.innerHTML = "";

    this.chart = LightweightCharts.createChart(this.container, {
      width: this.container.clientWidth,
      height: this.container.clientHeight || 480,
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
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: "#38bdf8", width: 1, style: 2 },
        horzLine: { color: "#38bdf8", width: 1, style: 2 }
      },
      rightPriceScale: {
        borderColor: "#223049"
      },
      timeScale: {
        borderColor: "#223049",
        timeVisible: true
      }
    });

    // Candlestick Series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444"
    });

    // Volume Series
    this.volumeSeries = this.chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });

    // Institutional VWAP Line (Purple)
    this.vwapSeries = this.chart.addLineSeries({
      color: "#a855f7",
      lineWidth: 2,
      title: "VWAP Anchor"
    });

    // VWAP Bands (Upper & Lower 1.5 sigma)
    this.vwapUpperSeries = this.chart.addLineSeries({
      color: "rgba(168, 85, 247, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
      title: "VWAP Upper Band"
    });

    this.vwapLowerSeries = this.chart.addLineSeries({
      color: "rgba(168, 85, 247, 0.4)",
      lineWidth: 1,
      lineStyle: 2,
      title: "VWAP Lower Band"
    });

    // Supertrend (10, 3) Line
    this.supertrendSeries = this.chart.addLineSeries({
      color: "#10b981",
      lineWidth: 2,
      title: "Supertrend (10,3)"
    });

    // EMA 9 & EMA 21
    this.ema9Series = this.chart.addLineSeries({
      color: "#06b6d4",
      lineWidth: 1.5,
      title: "EMA 9",
      visible: false
    });

    this.ema21Series = this.chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 1.5,
      title: "EMA 21",
      visible: false
    });

    // Resize listener
    window.addEventListener("resize", () => {
      if (this.chart && this.container) {
        this.chart.applyOptions({
          width: this.container.clientWidth,
          height: this.container.clientHeight || 480
        });
      }
    });

    // Subscribe to live market updates
    window.MarketData.subscribe((sym, quote) => {
      if (sym === this.activeSymbol && this.candleSeries) {
        this.updateLatestTick(quote.price);
      }
    });

    this.loadSymbol(this.activeSymbol);
  }

  loadSymbol(symbol) {
    this.activeSymbol = symbol;
    const candles = window.MarketData.getCandles(symbol, 60);

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

    this.candleSeries.setData(formattedCandles);
    this.volumeSeries.setData(formattedVolume);

    // Calculate & plot VWAP and Bands
    const vwapData = window.Indicators.calculateVWAP(candles);
    const formattedVwap = candles.map((c, i) => ({ time: c.time, value: vwapData.vwap[i] }));
    const formattedVwapUpper = candles.map((c, i) => ({ time: c.time, value: vwapData.upperBand[i] }));
    const formattedVwapLower = candles.map((c, i) => ({ time: c.time, value: vwapData.lowerBand[i] }));

    this.vwapSeries.setData(formattedVwap);
    this.vwapUpperSeries.setData(formattedVwapUpper);
    this.vwapLowerSeries.setData(formattedVwapLower);

    // Calculate & plot Supertrend (10, 3)
    const stData = window.Indicators.calculateSupertrend(candles, 10, 3);
    const formattedSt = [];
    candles.forEach((c, i) => {
      if (stData.supertrend[i] !== null) {
        formattedSt.push({ time: c.time, value: stData.supertrend[i] });
      }
    });
    this.supertrendSeries.setData(formattedSt);

    // Color Supertrend based on current direction
    const currentDir = stData.direction[stData.direction.length - 1];
    this.supertrendSeries.applyOptions({
      color: currentDir === 1 ? "#10b981" : "#ef4444"
    });

    // Calculate & plot EMAs
    const ema9 = window.Indicators.calculateEMA(candles, 9);
    const ema21 = window.Indicators.calculateEMA(candles, 21);

    const formattedEma9 = [];
    const formattedEma21 = [];

    candles.forEach((c, i) => {
      if (ema9[i] !== null) formattedEma9.push({ time: c.time, value: ema9[i] });
      if (ema21[i] !== null) formattedEma21.push({ time: c.time, value: ema21[i] });
    });

    this.ema9Series.setData(formattedEma9);
    this.ema21Series.setData(formattedEma21);

    // Calculate Opening Range (ORB)
    const orb = window.Indicators.calculateOpeningRange(candles, 3);

    // Redraw setup price lines based on VWAP & Supertrend
    const currentVwap = vwapData.vwap[vwapData.vwap.length - 1];
    const currentSt = stData.supertrend[stData.supertrend.length - 1];
    this.drawSetupLines(symbol, candles, currentVwap, currentSt, orb);

    // Update side technical dossier
    this.updateDossier(symbol, candles, currentVwap, currentSt, currentDir, orb);
  }

  updateLatestTick(price) {
    if (!this.candleSeries) return;
    const stock = window.MarketData.stocks[this.activeSymbol];
    if (!stock) return;

    const todayStr = new Date().toISOString().split("T")[0];
    this.candleSeries.update({
      time: todayStr,
      open: stock.open,
      high: stock.high,
      low: stock.low,
      close: price
    });
  }

  drawSetupLines(symbol, candles, currentVwap, currentSt, orb) {
    this.priceLines.forEach(l => this.candleSeries.removePriceLine(l));
    this.priceLines = [];

    const stock = window.MarketData.stocks[symbol];
    if (!stock) return;

    const ltp = stock.price;
    const atr = stock.atr;

    // Entry near VWAP or Supertrend
    const plannedEntry = currentVwap ? Math.round(currentVwap * 100) / 100 : ltp;
    const stopPrice = Math.round((Math.min(currentVwap, currentSt || currentVwap) - 0.4 * atr) * 100) / 100;
    const target1Price = Math.round((plannedEntry + 1.8 * (plannedEntry - stopPrice)) * 100) / 100;

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

    // Opening range reference lines
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

    // Supertrend dossier entry
    const dossierSt = document.getElementById("dossierSupertrend");
    if (dossierSt && currentSt) {
      dossierSt.innerHTML = `<span style="color:${currentDir === 1 ? '#10b981' : '#ef4444'}; font-weight:700;">₹${currentSt.toFixed(2)} (${currentDir === 1 ? 'BULLISH' : 'BEARISH'})</span>`;
    }

    // Opening range entry
    const dossierOrb = document.getElementById("dossierOrb");
    if (dossierOrb && orb) {
      dossierOrb.innerText = `₹${orb.low.toFixed(2)} - ₹${orb.high.toFixed(2)}`;
    }

    const fibBody = document.getElementById("fibTableBody");
    if (fibBody) {
      fibBody.innerHTML = Object.entries(fib.levels)
        .map(([lvl, prc]) => `<tr><td style="color:#94a3b8;">${lvl}</td><td style="color:${prc >= stock.price ? '#10b981' : '#f59e0b'};">₹${prc.toFixed(2)}</td></tr>`)
        .join("");
    }
  }

  toggleIndicator(name) {
    if (name === "vwap") {
      this.visibleIndicators.vwap = !this.visibleIndicators.vwap;
      this.vwapSeries.applyOptions({ visible: this.visibleIndicators.vwap });
    } else if (name === "bands") {
      this.visibleIndicators.bands = !this.visibleIndicators.bands;
      this.vwapUpperSeries.applyOptions({ visible: this.visibleIndicators.bands });
      this.vwapLowerSeries.applyOptions({ visible: this.visibleIndicators.bands });
    } else if (name === "supertrend") {
      this.visibleIndicators.supertrend = !this.visibleIndicators.supertrend;
      this.supertrendSeries.applyOptions({ visible: this.visibleIndicators.supertrend });
    } else if (name === "ema9") {
      this.visibleIndicators.ema9 = !this.visibleIndicators.ema9;
      this.ema9Series.applyOptions({ visible: this.visibleIndicators.ema9 });
    } else if (name === "ema21") {
      this.visibleIndicators.ema21 = !this.visibleIndicators.ema21;
      this.ema21Series.applyOptions({ visible: this.visibleIndicators.ema21 });
    }
  }
}

window.ChartStudio = ChartStudio;
