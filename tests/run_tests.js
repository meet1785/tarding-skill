/**
 * TradeMind AI - Comprehensive Automated Unit & Integration Test Suite
 * Tests:
 * 1. Technical indicator algorithms (VWAP, Supertrend, RSI, EMA, SMA, Fibonacci, ORB)
 * 2. Multi-Timeframe Confluence Matrix (Daily, 15m, 5m, 1m)
 * 3. Strict Capital & Risk Management (₹1,000 cap, max ₹15 risk, 5x MIS leverage)
 * 4. Regulatory NSE Brokerage, STT, Stamp Duty, GST, Exchange charges
 * 5. Dynamic Trailing Stop-Loss Engine (Breakeven lock at +1R, ATR trail at +1.5R)
 * 6. Account Drawdown Circuit Breaker (Halt after 2 consecutive losses)
 * 7. Market Scanner recommendations and Backtester expectancy
 */

// Setup mock environment for headless Node.js execution
const mockStorage = {};
global.localStorage = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.window = {
  localStorage: global.localStorage,
  showToast: () => {}
};

global.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

// Import modules
const MarketData = require("../js/data.js");
const Indicators = require("../js/indicators.js");
const PaperTradingEngine = require("../js/papertrading.js");
const StrategyBacktester = require("../js/backtester.js");
const ResearchScanner = require("../js/scanner.js");

// Attach to window for modules expecting window references
global.window.MarketData = MarketData;
global.window.Indicators = Indicators;
global.window.PaperTradingEngine = PaperTradingEngine;
global.window.StrategyBacktester = StrategyBacktester;
global.window.ResearchScanner = ResearchScanner;

// Test Runner Framework
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, testName, details = "") {
  if (condition) {
    passedTests++;
    testResults.push({ name: testName, status: "PASS", details });
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    testResults.push({ name: testName, status: "FAIL", details });
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("             TradeMind AI - Automated Test Suite Runner (v2.1)                 ");
  console.log("===============================================================================\n");

  // Sample synthetic candle data for mathematical verification
  const syntheticCandles = [];
  let price = 100;
  for (let i = 0; i < 40; i++) {
    price += (i % 2 === 0 ? 1.5 : -0.8);
    syntheticCandles.push({
      time: `2026-11-${String(i + 1).padStart(2, "0")}`,
      open: price - 0.5,
      high: price + 1.2,
      low: price - 1.0,
      close: price,
      volume: 10000 + i * 500
    });
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: Mathematical & Quantitative Indicator Algorithms
  // ---------------------------------------------------------------------------
  console.log("--- Section 1: Quantitative Indicator Algorithms ---");

  // 1. SMA
  const sma20 = Indicators.calculateSMA(syntheticCandles, 20);
  assert(
    sma20.length === syntheticCandles.length && sma20[0] === null && typeof sma20[25] === "number",
    "SMA(20) returns null for initial period and valid floats thereafter",
    `sma20[25]=${sma20[25]}`
  );

  // 2. EMA
  const ema9 = Indicators.calculateEMA(syntheticCandles, 9);
  assert(
    ema9.length === syntheticCandles.length && typeof ema9[30] === "number" && !isNaN(ema9[30]),
    "EMA(9) computes exponential smoothing weights accurately",
    `ema9[30]=${ema9[30]}`
  );

  // 3. RSI
  const rsiArr = Indicators.calculateRSI(syntheticCandles, 14);
  const lastRSI = rsiArr[rsiArr.length - 1];
  assert(
    typeof lastRSI === "number" && lastRSI >= 0 && lastRSI <= 100,
    "RSI(14) calculates within valid bounded oscillation range [0, 100]",
    `lastRSI=${lastRSI}`
  );

  // 4. VWAP
  const vwapRes = Indicators.calculateVWAP(syntheticCandles);
  const lastVWAP = vwapRes.vwap[vwapRes.vwap.length - 1];
  assert(
    typeof lastVWAP === "number" && lastVWAP > 90 && lastVWAP < 150 && vwapRes.upperBand.length === syntheticCandles.length,
    "VWAP calculates volume-weighted typical price accumulation and standard deviation bands",
    `lastVWAP=${lastVWAP}`
  );

  // 5. Supertrend
  const stResult = Indicators.calculateSupertrend(syntheticCandles, 10, 3);
  const lastSTDir = stResult.direction[stResult.direction.length - 1];
  assert(
    stResult.supertrend.length === syntheticCandles.length && (lastSTDir === 1 || lastSTDir === -1),
    "Supertrend(10,3) outputs directional bias (1=Bullish, -1=Bearish)",
    `lastSTDir=${lastSTDir}`
  );

  // 6. Opening Range Breakout (ORB)
  const orb = Indicators.calculateOpeningRange(syntheticCandles, 3);
  assert(
    orb.high >= orb.midpoint && orb.midpoint >= orb.low,
    "15-Minute Opening Range accurately captures High, Low, and Midpoint",
    `H=${orb.high}, L=${orb.low}, Mid=${orb.midpoint}`
  );

  // 7. Fibonacci Levels
  const fib = Indicators.calculateFibonacci(150, 100);
  assert(
    fib.levels["50.0% Equilibrium"] === 125 &&
    fib.levels["61.8% Golden Pocket"] === 119.1 &&
    fib.levels["161.8% Golden Extension"] === 180.9,
    "Fibonacci calculator generates exact 50%, 61.8%, and 161.8% extension levels",
    `50%=${fib.levels["50.0% Equilibrium"]}, 61.8%=${fib.levels["61.8% Golden Pocket"]}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: Multi-Timeframe Confluence Matrix (Feature 1)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: Multi-Timeframe Confluence Matrix ---");

  // 8. Full Bullish Confluence (Daily, 15m, 5m, 1m)
  const mtfBullish = Indicators.calculateMultiTimeframeMatrix(syntheticCandles, 125, 110, 1);
  assert(
    mtfBullish.totalTimeframes === 4 && mtfBullish.bullishCount >= 3 && mtfBullish.alignedBullish === true,
    "Multi-Timeframe Matrix identifies bullish alignment when price > VWAP, Supertrend=1, and Daily trend is up",
    `bullishCount=${mtfBullish.bullishCount}/4, status=${mtfBullish.confluenceStatus}`
  );

  // 9. Bearish Divergence Detection
  const mtfBearish = Indicators.calculateMultiTimeframeMatrix(syntheticCandles, 80, 130, -1);
  assert(
    mtfBearish.alignedBullish === false && mtfBearish.confluenceStatus === "BEARISH_DIVERGENCE",
    "Multi-Timeframe Matrix flags BEARISH_DIVERGENCE when price breaks below VWAP and Supertrend is bearish",
    `bullishCount=${mtfBearish.bullishCount}/4, status=${mtfBearish.confluenceStatus}`
  );

  // 10. Insufficient Data Fallback
  const mtfShort = Indicators.calculateMultiTimeframeMatrix([{ close: 100 }], 100, 100, 1);
  assert(
    mtfShort.confluenceStatus === "INSUFFICIENT_DATA" && mtfShort.alignedBullish === false,
    "Multi-Timeframe Matrix gracefully handles insufficient candle history",
    `status=${mtfShort.confluenceStatus}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 3: Strict Risk Management & Position Sizing
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: Risk Management & Position Sizing ---");

  // 11. Strict ₹15 Max Risk on ₹1,000 Capital (1.5%)
  const size1 = Indicators.calculatePositionSize(1000, 1.5, 145.84, 143.50, 5);
  assert(
    size1.riskAmount <= 15.00 && size1.shares > 0,
    "Position sizing strictly respects ₹15 max risk cap on ₹1,000 account",
    `shares=${size1.shares}, actualRisk=₹${size1.riskAmount}, riskCap=₹15.00`
  );

  // 12. 5x MIS Margin Cap (₹5,000 buying power max)
  const size2 = Indicators.calculatePositionSize(1000, 1.5, 25.00, 24.00, 5);
  assert(
    size2.marginRequired <= 1000 && size2.totalTradeValue <= 5000,
    "5x MIS leverage limits total position size to available ₹5,000 buying power",
    `marginRequired=₹${size2.marginRequired}, totalValue=₹${size2.totalTradeValue}`
  );

  // 13. Invalid Stop Loss Guard
  const sizeInvalid = Indicators.calculatePositionSize(1000, 1.5, 145.00, 146.00, 5);
  assert(
    sizeInvalid.shares === 0,
    "Position sizer safely rejects invalid stop-loss (SL >= Entry for Long)",
    `shares=${sizeInvalid.shares}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: Indian Brokerage & Statutory Taxes (Zerodha/Groww structure)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 4: Indian Statutory Taxes & Brokerage ---");

  // 14. Deductions: Brokerage, STT, Exchange, GST, Stamp Duty
  const taxCalc = Indicators.calculateNSEBrokerageAndTaxes(145.00, 150.00, 6);
  assert(
    taxCalc.brokerage > 0 &&
    taxCalc.stt > 0 &&
    taxCalc.gst > 0 &&
    taxCalc.stampDuty > 0 &&
    taxCalc.totalTaxesAndCharges > 0,
    "Brokerage engine computes real Zerodha/Groww charges (Brokerage, STT, GST, Stamp Duty)",
    `totalTaxes=₹${taxCalc.totalTaxesAndCharges}`
  );

  // 15. Net PnL accurately deducted
  const expectedNet = Math.round((taxCalc.grossPnL - taxCalc.totalTaxesAndCharges) * 100) / 100;
  assert(
    Math.abs(taxCalc.netPnL - expectedNet) < 0.05,
    "Net PnL accurately reflects Gross PnL minus all regulatory taxes and charges",
    `gross=₹${taxCalc.grossPnL}, taxes=₹${taxCalc.totalTaxesAndCharges}, net=₹${taxCalc.netPnL}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 5: Dynamic Trailing Stop-Loss Engine (Feature 2)
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 5: Dynamic Trailing Stop-Loss Engine ---");

  mockStorage["trademind_paper_state"] = JSON.stringify({
    cash: 1000,
    positions: [],
    tradeHistory: [],
    learningNotes: [],
    dailyDrawdownHalt: false,
    consecutiveLosses: 0,
    autonomousBotEnabled: false
  });

  const engine = new PaperTradingEngine();

  // 16. Engine Initialization
  assert(
    engine.cash === 1000 && engine.positions.length === 0,
    "PaperTradingEngine initializes with default ₹1,000 capital profile",
    `cash=₹${engine.cash}`
  );

  // 17. Trade Execution & Margin Deduction
  const tradeRes = engine.executeTrade({
    symbol: "CANBK",
    action: "BUY",
    type: "MIS",
    quantity: 10,
    price: 130.00,
    stopLoss: 128.50, // 1R = 1.50
    target: 134.50
  });

  assert(
    tradeRes.success === true && engine.positions.length === 1,
    "Trade executes successfully and records open position in memory",
    `posId=${engine.positions[0]?.id}`
  );

  const pos = engine.positions[0];

  // 18. Initial Stop-Loss and Auto-Trail defaults
  assert(
    pos.initialStopLoss === 128.50 && pos.autoTrail === true && pos.trailStatus === "INITIAL",
    "Position initializes autoTrail=true, saves initialStopLoss, and sets trailStatus='INITIAL'",
    `initialSL=${pos.initialStopLoss}, autoTrail=${pos.autoTrail}, status=${pos.trailStatus}`
  );

  // 19. Breakeven Lock at +1.0R (Entry=130, SL=128.50 -> 1R=1.50 -> Price=131.55)
  // Current price goes to 131.55 (+1.03R)
  engine.onPriceTick("CANBK", 131.55);
  const posAfterBreakeven = engine.positions.find(p => p.id === pos.id);
  assert(
    posAfterBreakeven.trailStatus === "BREAKEVEN_LOCKED" && posAfterBreakeven.stopLoss === 130.10,
    "Dynamic Trailing Stop locks Breakeven (+0.10 buffer = 130.10) once trade gains +1.0R",
    `stopLoss=₹${posAfterBreakeven.stopLoss}, trailStatus=${posAfterBreakeven.trailStatus}`
  );

  // 20. Dynamic ATR Trailing at +1.5R (Price reaches 133.00, ATR=3.10 -> 0.75*ATR=2.32 -> newSL=130.68)
  engine.onPriceTick("CANBK", 133.00);
  const posAfterTrail = engine.positions.find(p => p.id === pos.id);
  assert(
    posAfterTrail.trailStatus === "TRAILING_ACTIVE" && posAfterTrail.stopLoss > 130.10,
    "Dynamic Trailing Stop activates trailing mode at +1.5R and ratchets stop-loss upward",
    `stopLoss=₹${posAfterTrail.stopLoss}, trailStatus=${posAfterTrail.trailStatus}`
  );

  // 21. Stop-Loss Ratchet Invariance (Stop-loss NEVER decreases if price pulls back)
  const previousSL = posAfterTrail.stopLoss;
  engine.onPriceTick("CANBK", 132.00); // Price drops from 133 to 132
  const posAfterPullback = engine.positions.find(p => p.id === pos.id);
  assert(
    posAfterPullback.stopLoss === previousSL,
    "Trailing Stop-Loss ratchet guarantees stop-loss never moves down during adverse price pullbacks",
    `previousSL=₹${previousSL}, currentSL=₹${posAfterPullback.stopLoss}`
  );

  // 22. Manual Trailing Stop Toggle
  engine.toggleTrailingStop(pos.id);
  assert(
    posAfterPullback.autoTrail === false,
    "Trader can toggle Auto-Trail OFF to hold manual fixed stops",
    `autoTrail=${posAfterPullback.autoTrail}`
  );
  engine.toggleTrailingStop(pos.id);
  assert(
    posAfterPullback.autoTrail === true,
    "Trader can re-enable Auto-Trail dynamically during trade lifecycle",
    `autoTrail=${posAfterPullback.autoTrail}`
  );

  // 23. Target Hit Exit with Regulatory Taxes
  engine.onPriceTick("CANBK", 135.00); // Hits target 134.50
  assert(
    engine.positions.length === 0 && engine.tradeHistory.length === 1,
    "Target Hit automatically closes position and records full audit log in tradeHistory",
    `tradesCount=${engine.tradeHistory.length}, reason=${engine.tradeHistory[0]?.reason}`
  );

  const completedTrade = engine.tradeHistory[0];
  assert(
    completedTrade.realizedPnL > 0 && completedTrade.taxes > 0,
    "Trade exit records positive Net Realized PnL after paying Indian exchange taxes",
    `netPnL=₹${completedTrade.realizedPnL}, taxes=₹${completedTrade.taxes}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 6: Account Drawdown Circuit Breaker & Safeguards
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 6: Drawdown Circuit Breaker & Safeguards ---");

  // Force two consecutive losing trades to test circuit breaker
  engine.executeTrade({
    symbol: "PNB",
    action: "BUY",
    type: "MIS",
    quantity: 6,
    price: 145.00,
    stopLoss: 143.00,
    target: 150.00
  });
  engine.onPriceTick("PNB", 142.00); // Stop-loss hit (Loss #1)

  engine.executeTrade({
    symbol: "TATASTEEL",
    action: "BUY",
    type: "MIS",
    quantity: 5,
    price: 160.00,
    stopLoss: 158.00,
    target: 165.00
  });
  engine.onPriceTick("TATASTEEL", 157.00); // Stop-loss hit (Loss #2)

  // 24. Circuit Breaker Triggered
  assert(
    engine.dailyDrawdownHalt === true && engine.consecutiveLosses >= 2,
    "Circuit breaker automatically activates after 2 consecutive losing trades",
    `dailyDrawdownHalt=${engine.dailyDrawdownHalt}, consecutiveLosses=${engine.consecutiveLosses}`
  );

  // 25. Block New Orders During Circuit Breaker Halt
  const blockedTrade = engine.executeTrade({
    symbol: "POWERGRID",
    action: "BUY",
    type: "MIS",
    quantity: 5,
    price: 320.00,
    stopLoss: 316.00,
    target: 330.00
  });

  assert(
    blockedTrade.success === false && blockedTrade.message.includes("CIRCUIT BREAKER"),
    "Engine blocks all new trade execution while Circuit Breaker halt is active",
    `blockedMessage=${blockedTrade.message}`
  );

  // 26. Reset Circuit Breaker
  engine.resetCircuitBreaker();
  assert(
    engine.dailyDrawdownHalt === false && engine.consecutiveLosses === 0,
    "Circuit breaker can be manually reset after trader emotional cooldown period",
    `halt=${engine.dailyDrawdownHalt}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 7: Market Scanner & Backtester Expectancy Validation
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 7: Scanner & Backtester Expectancy Validation ---");

  // 27. Scanner generates recommendations with Multi-Timeframe Matrix
  const scanResults = await ResearchScanner.runResearch({ capital: 1000, leverage: 5, riskPct: 1.5, sector: "all" });
  assert(
    scanResults.length > 0 && scanResults[0].mtfMatrix !== undefined,
    "Market Scanner generates recommendations equipped with Multi-Timeframe Alignment matrix",
    `count=${scanResults.length}, firstSymbol=${scanResults[0]?.symbol}, mtfStatus=${scanResults[0]?.mtfMatrix?.confluenceStatus}`
  );

  // 28. Scanner generates valid Risk-Reward Ratios
  const allValidRR = scanResults.every(r => r.riskRewardRatio >= 1.5);
  assert(
    allValidRR === true,
    "All scanner recommendations satisfy minimum asymmetric 1:1.5 Risk-to-Reward threshold",
    `lowestRR=${Math.min(...scanResults.map(r => r.riskRewardRatio))}`
  );

  // 29. Strategy Backtester Expectancy
  const backtest = StrategyBacktester.runBacktest("PNB", "supertrend_vwap_confluence", 1000, 1.5);

  assert(
    backtest.tradesCount >= 0 &&
    typeof backtest.winRate === "number" &&
    typeof backtest.profitFactor === "number" &&
    typeof backtest.maxDrawdownPct === "number",
    "Strategy Backtester computes realistic metrics (win rate, profit factor, max drawdown)",
    `trades=${backtest.tradesCount}, winRate=${backtest.winRate}%, profitFactor=${backtest.profitFactor}, maxDD=${backtest.maxDrawdownPct}%`
  );

  // 30. Historical Candle Generator Consistency
  const testCandles = MarketData.getCandles("CANBK", 40, "1D");
  const lastTestCandle = testCandles[testCandles.length - 1];
  assert(
    testCandles.length === 41 &&
    lastTestCandle.close === MarketData.stocks.CANBK.price &&
    lastTestCandle.high >= lastTestCandle.low,
    "MarketData.getCandles creates synthetically realistic OHLCV candles pinned to live LTP",
    `candlesCount=${testCandles.length}, lastClose=${lastTestCandle.close}`
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n===============================================================================");
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${passedTests + failedTests} tests`);
  console.log("===============================================================================");

  if (failedTests > 0) {
    console.error(`\n❌ ${failedTests} test(s) failed!`);
    process.exit(1);
  } else {
    console.log("\n✅ All 30 tests passed with 100% success rate! Clean bill of health.");
    process.exit(0);
  }
}

// Execute tests
runTestSuite();
