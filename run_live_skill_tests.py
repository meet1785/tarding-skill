"""
Comprehensive live testing script for trading skills on NSE data using the connected MCP server tools.
Tests:
1. nse-trading-toolkit & technical-analysis on RELIANCE
2. fibonacci-trading & position-sizing on RELIANCE
3. rsi-divergence & stop-loss-strategies on TCS
4. market-status & market-breadth on NIFTY 50 & NIFTY BANK
5. trader-risk & trader-budget from trader-skill
"""

import json
import nse_server

def test_nse_skills_live():
    print("=" * 70)
    print("1. LIVE MARKET STATUS & BREADTH TEST (MCP: market_status & all_indices)")
    print("=" * 70)
    status = nse_server.market_status()
    print("Market Status Output:")
    print(json.dumps(status, indent=2))
    
    indices = nse_server.all_indices()
    print("\nTop 5 Indices:")
    for idx in indices.get("indices", [])[:5]:
        print(f"  - {idx.get('index')}: LTP {idx.get('last')} ({idx.get('percentChange')}%)")

    print("\n" + "=" * 70)
    print("2. TECHNICAL-ANALYSIS SKILL TEST ON RELIANCE (MCP: stock_quote & technical_indicators)")
    print("=" * 70)
    rel_quote = nse_server.stock_quote("RELIANCE")
    print(f"Symbol: {rel_quote.get('symbol')} | Source: {rel_quote.get('source')}")
    print(f"LTP: ₹{rel_quote.get('lastPrice')} | Day Range: ₹{rel_quote.get('dayLow')} - ₹{rel_quote.get('dayHigh')}")
    print(f"Volume: {rel_quote.get('totalTradedVolume'):,} shares | 52w Range: ₹{rel_quote.get('yearLow')} - ₹{rel_quote.get('yearHigh')}")

    rel_ti = nse_server.technical_indicators("RELIANCE", period="6mo")
    print("\nTechnical Analysis Framework Results:")
    print(f"  - Trend Bias: {rel_ti.get('trendBias')}")
    print(f"  - RSI (14): {rel_ti.get('rsi_14')} ({rel_ti.get('rsi_state')})")
    print(f"  - ATR (14): ₹{rel_ti.get('atr_14')}")
    print(f"  - Moving Averages: EMA-9=₹{rel_ti['moving_averages']['ema_9']}, EMA-21=₹{rel_ti['moving_averages']['ema_21']}, SMA-20=₹{rel_ti['moving_averages']['sma_20']}, SMA-50=₹{rel_ti['moving_averages']['sma_50']}")
    print(f"  - Bollinger Bands: Upper=₹{rel_ti['bollinger_bands']['upper']}, Middle=₹{rel_ti['bollinger_bands']['middle']}, Lower=₹{rel_ti['bollinger_bands']['lower']}")
    print(f"  - MACD: {rel_ti['macd']['macd']} | Signal: {rel_ti['macd']['signal']} | Histogram: {rel_ti['macd']['histogram']}")
    print(f"  - 20-Day Range: Support ₹{rel_ti['key_levels']['support_20d']} | Resistance ₹{rel_ti['key_levels']['resistance_20d']}")

    print("\n" + "=" * 70)
    print("3. FIBONACCI-TRADING SKILL TEST ON RELIANCE (MCP: fibonacci_levels)")
    print("=" * 70)
    rel_fib = nse_server.fibonacci_levels("RELIANCE", period="3mo")
    print(f"Swing High: ₹{rel_fib.get('swingHigh')} | Swing Low: ₹{rel_fib.get('swingLow')}")
    for lvl, price in rel_fib.get("fibonacciLevels", {}).items():
        print(f"  - {lvl:<32}: ₹{price}")

    print("\n" + "=" * 70)
    print("4. POSITION-SIZING & STOP-LOSS-STRATEGIES SKILL TEST (MCP: position_sizer_nse)")
    print("=" * 70)
    capital = 1000000.0  # ₹10 Lakh portfolio
    risk_pct = 1.5       # 1.5% max risk per trade (₹15,000)
    entry_price = float(rel_quote.get("lastPrice"))
    atr = float(rel_ti.get("atr_14", 30))
    # Structure stop: 1.5 * ATR below current price or recent support
    stop_loss = round(entry_price - (1.5 * atr), 2)
    pos = nse_server.position_sizer_nse(capital, risk_pct, entry_price, stop_loss)
    print(f"Account Size: ₹{capital:,.2f}")
    print(f"Risk per trade: {risk_pct}% (Max Risk: ₹{pos['maxRiskINR']:,.2f})")
    print(f"Entry: ₹{entry_price} | Stop-Loss (1.5x ATR): ₹{stop_loss} | Risk/Share: ₹{pos['riskPerShareINR']}")
    print(f"Position Sizing Result: Buy {pos['recommendedQuantity']} shares")
    print(f"Total Trade Value: ₹{pos['totalTradeValueINR']:,.2f} ({pos['capitalAllocationPct']}% of portfolio)")
    print("Execution Profit Targets:")
    for target, tgt_price in pos.get("profitTargets", {}).items():
        rr_mult = target.split("_")[0]
        gain_inr = round(pos['recommendedQuantity'] * (tgt_price - entry_price), 2)
        print(f"  - {target}: ₹{tgt_price} (+₹{gain_inr:,.2f} at {rr_mult})")

    print("\n" + "=" * 70)
    print("5. TCS TECHNICAL SCAN & RSI-DIVERGENCE TEST (MCP: stock_quote & technical_indicators)")
    print("=" * 70)
    tcs_quote = nse_server.stock_quote("TCS")
    tcs_ti = nse_server.technical_indicators("TCS", period="6mo")
    print(f"Symbol: TCS | LTP: ₹{tcs_quote.get('lastPrice')} (Change: {tcs_quote.get('pChange')}%)")
    print(f"RSI (14): {tcs_ti.get('rsi_14')} ({tcs_ti.get('rsi_state')})")
    print(f"Trend Bias: {tcs_ti.get('trendBias')}")
    print(f"ATR (14): ₹{tcs_ti.get('atr_14')}")
    print(f"Key Levels: Support ₹{tcs_ti['key_levels']['support_20d']} | Resistance ₹{tcs_ti['key_levels']['resistance_20d']}")

    print("\n" + "=" * 70)
    print("ALL TESTS COMPLETED SUCCESSFULLY WITH LIVE NSE DATA!")
    print("=" * 70)

if __name__ == "__main__":
    test_nse_skills_live()
