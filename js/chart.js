/**
 * TradeMind AI - Interactive Live Chart Studio (v2 with Institutional VWAP)
 * Powered by TradingView Lightweight Charts with multi-indicator overlays & VWAP Value Projections.
 */

class ChartStudio {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.vwapSeries = null;
    this.ema9Series = null;
    this.ema21Series = null;
    this.activeSymbol = "PNB";
    this.priceLines = [];
    this.visibleIndicators = {
      vwap: true,
      ema9: true,
      ema21: true,
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
      title: "VWAP (Institutional Anchor)"
    });

    // EMA 9 & EMA 21
    this.ema9Series = this.chart.addLineSeries({
      color: "#06b6d4",
      lineWidth: 1.5,
      title: "EMA 9"
    });

    this.ema21Series = this.chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 1.5,
      title: "EMA 21"
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

    // Calculate & plot VWAP
    const vwapData = window.Indicators.calculateVWAP(candles);
    const formattedVwap = candles.map((c, i) => ({ time: c.time, value: vwapData.vwap[i] }));
    this.vwapSeries.setData(formattedVwap);

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

    // Redraw setup price lines based on VWAP
    this.drawSetupLines(symbol, candles, vwapData.vwap[vwapData.vwap.length - 1]);

    // Update side technical dossier
    this.updateDossier(symbol, candles, vwapData.vwap[vwapData.vwap.length - 1]);
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

  drawSetupLines(symbol, candles, currentVwap) {
    this.priceLines.forEach(l => this.candleSeries.removePriceLine(l));
    this.priceLines = [];

    const stock = window.MarketData.stocks[symbol];
    if (!stock) return;

    const ltp = stock.price;
    const atr = stock.atr;

    // Entry near VWAP
    const plannedEntry = currentVwap ? Math.round(currentVwap * 100) / 100 : ltp;
    const stopPrice = Math.round((plannedEntry - 0.5 * atr) * 100) / 100;
    const targetPrice = Math.round((plannedEntry + 1.2 * atr) * 100) / 100;

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
      title: "STOP-LOSS: ₹" + stopPrice
    });

    const targetLine = this.candleSeries.createPriceLine({
      price: targetPrice,
      color: "#10b981",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "TARGET 1: ₹" + targetPrice
    });

    this.priceLines.push(entryLine, stopLine, targetLine);
  }

  updateDossier(symbol, candles, currentVwap) {
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
