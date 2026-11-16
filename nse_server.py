"""
Production-grade NSE (National Stock Exchange of India) MCP Server.
Provides live quotes, market status, technical indicators, historical OHLCV,
and Fibonacci/RSI calculations using FastMCP.
"""

import sys
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from requests import Session
import yfinance as yf
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("nse-live-data")

def get_nse_session() -> Session:
    s = Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
    })
    return s

@mcp.tool()
def market_status() -> Dict[str, Any]:
    """Get current live NSE market status and major index summary."""
    try:
        s = get_nse_session()
        r = s.get("https://www.nseindia.com/api/marketStatus", timeout=6)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    
    # Fallback via yfinance for ^NSEI (Nifty 50)
    t = yf.Ticker("^NSEI")
    info = t.fast_info
    return {
        "marketState": [{
            "market": "Capital Market (NSE)",
            "index": "NIFTY 50",
            "last": round(info.last_price, 2),
            "previousClose": round(info.previous_close, 2),
            "variation": round(info.last_price - info.previous_close, 2),
            "percentChange": round(((info.last_price - info.previous_close) / info.previous_close) * 100, 2),
            "marketStatusMessage": "Data retrieved successfully"
        }]
    }

@mcp.tool()
def all_indices() -> Dict[str, Any]:
    """Get live prices and percent changes for all key NSE indices (NIFTY 50, NIFTY BANK, etc.)."""
    try:
        s = get_nse_session()
        r = s.get("https://www.nseindia.com/api/allIndices", timeout=6)
        if r.status_code == 200:
            data = r.json()
            indices = []
            for item in data.get("data", []):
                indices.append({
                    "index": item.get("index"),
                    "last": item.get("last"),
                    "percentChange": item.get("percentChange"),
                    "open": item.get("open"),
                    "high": item.get("high"),
                    "low": item.get("low"),
                    "previousClose": item.get("previousClose"),
                })
            return {"timestamp": data.get("timestamp"), "indices": indices}
    except Exception:
        pass

    # Fallback to key indices
    fallback_map = {"NIFTY 50": "^NSEI", "NIFTY BANK": "^NSEBANK"}
    res = []
    for name, sym in fallback_map.items():
        t = yf.Ticker(sym)
        p = t.fast_info.last_price
        pc = t.fast_info.previous_close
        res.append({
            "index": name,
            "last": round(p, 2),
            "percentChange": round(((p - pc) / pc) * 100, 2),
            "previousClose": round(pc, 2)
        })
    return {"indices": res}

@mcp.tool()
def stock_quote(symbol: str) -> Dict[str, Any]:
    """
    Get real-time live quote for an NSE equity symbol (e.g. 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY').
    """
    sym = symbol.upper().strip()
    # Check if stock is in NIFTY 50 constituents via direct NSE API first
    try:
        s = get_nse_session()
        r = s.get("https://www.nseindia.com/api/equity-stock-indices?index=NIFTY%2050", timeout=6)
        if r.status_code == 200:
            stocks = r.json().get("data", [])
            for st in stocks:
                if st.get("symbol") == sym:
                    return {
                        "symbol": sym,
                        "source": "NSE Direct Live Feed",
                        "lastPrice": st.get("lastPrice"),
                        "change": st.get("change"),
                        "pChange": st.get("pChange"),
                        "open": st.get("open"),
                        "dayHigh": st.get("dayHigh"),
                        "dayLow": st.get("dayLow"),
                        "previousClose": st.get("previousClose"),
                        "totalTradedVolume": st.get("totalTradedVolume"),
                        "totalTradedValue": st.get("totalTradedValue"),
                        "yearHigh": st.get("yearHigh"),
                        "yearLow": st.get("yearLow"),
                        "lastUpdateTime": st.get("lastUpdateTime")
                    }
    except Exception:
        pass

    # Seamless live ticker resolution via yfinance (.NS)
    ticker_sym = sym if sym.endswith(".NS") else f"{sym}.NS"
    t = yf.Ticker(ticker_sym)
    info = t.fast_info
    hist = t.history(period="5d", interval="1d")
    
    latest_close = float(hist["Close"].iloc[-1]) if not hist.empty else float(info.last_price)
    prev_close = float(info.previous_close) if info.previous_close else float(hist["Close"].iloc[-2]) if len(hist) > 1 else latest_close
    change = round(latest_close - prev_close, 2)
    p_change = round((change / prev_close) * 100, 2) if prev_close else 0.0

    return {
        "symbol": sym,
        "source": "NSE yfinance Live Bridge",
        "lastPrice": round(latest_close, 2),
        "change": change,
        "pChange": p_change,
        "open": round(float(info.open), 2) if info.open else None,
        "dayHigh": round(float(info.day_high), 2) if info.day_high else None,
        "dayLow": round(float(info.day_low), 2) if info.day_low else None,
        "previousClose": round(prev_close, 2),
        "yearHigh": round(float(info.year_high), 2) if info.year_high else None,
        "yearLow": round(float(info.year_low), 2) if info.year_low else None,
        "currency": "INR",
        "exchange": "NSE"
    }

@mcp.tool()
def technical_indicators(symbol: str, period: str = "6mo") -> Dict[str, Any]:
    """
    Calculate comprehensive technical indicators for an NSE stock.
    Includes RSI (14), ATR (14), Moving Averages (20, 50, 200 SMA & 9, 21 EMA),
    MACD, Bollinger Bands, and Key Support/Resistance.
    """
    sym = symbol.upper().strip()
    ticker_sym = sym if sym.endswith(".NS") else f"{sym}.NS"
    t = yf.Ticker(ticker_sym)
    df = t.history(period=period, interval="1d")

    if df.empty or len(df) < 20:
        return {"error": f"Insufficient data for symbol {sym}"}

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    # Moving Averages
    sma_20 = round(float(close.rolling(window=20).mean().iloc[-1]), 2)
    sma_50 = round(float(close.rolling(window=50).mean().iloc[-1]), 2) if len(df) >= 50 else None
    sma_200 = round(float(close.rolling(window=200).mean().iloc[-1]), 2) if len(df) >= 200 else None
    ema_9 = round(float(close.ewm(span=9, adjust=False).mean().iloc[-1]), 2)
    ema_21 = round(float(close.ewm(span=21, adjust=False).mean().iloc[-1]), 2)

    # RSI (14)
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi_series = 100 - (100 / (1 + rs))
    current_rsi = round(float(rsi_series.iloc[-1]), 2)
    prev_rsi = round(float(rsi_series.iloc[-2]), 2)

    # ATR (14)
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_14 = round(float(tr.rolling(window=14).mean().iloc[-1]), 2)

    # Bollinger Bands (20, 2)
    bb_mean = close.rolling(window=20).mean()
    bb_std = close.rolling(window=20).std()
    bb_upper = round(float((bb_mean + (bb_std * 2)).iloc[-1]), 2)
    bb_lower = round(float((bb_mean - (bb_std * 2)).iloc[-1]), 2)

    # MACD (12, 26, 9)
    exp12 = close.ewm(span=12, adjust=False).mean()
    exp26 = close.ewm(span=26, adjust=False).mean()
    macd_line = exp12 - exp26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    # Support / Resistance (recent 20-day high and low)
    recent_resistance = round(float(high.iloc[-20:].max()), 2)
    recent_support = round(float(low.iloc[-20:].min()), 2)

    curr_price = round(float(close.iloc[-1]), 2)

    trend = "Bullish" if (sma_50 and curr_price > sma_50 and (sma_200 is None or curr_price > sma_200)) else "Bearish" if (sma_50 and curr_price < sma_50) else "Neutral"

    return {
        "symbol": sym,
        "currentPrice": curr_price,
        "trendBias": trend,
        "rsi_14": current_rsi,
        "rsi_state": "Overbought (>70)" if current_rsi >= 70 else "Oversold (<30)" if current_rsi <= 30 else "Neutral",
        "atr_14": atr_14,
        "moving_averages": {
            "ema_9": ema_9,
            "ema_21": ema_21,
            "sma_20": sma_20,
            "sma_50": sma_50,
            "sma_200": sma_200
        },
        "bollinger_bands": {
            "upper": bb_upper,
            "middle": sma_20,
            "lower": bb_lower
        },
        "macd": {
            "macd": round(float(macd_line.iloc[-1]), 2),
            "signal": round(float(signal_line.iloc[-1]), 2),
            "histogram": round(float(macd_hist.iloc[-1]), 2)
        },
        "key_levels": {
            "resistance_20d": recent_resistance,
            "support_20d": recent_support
        }
    }

@mcp.tool()
def fibonacci_levels(symbol: str, period: str = "3mo") -> Dict[str, Any]:
    """
    Compute Fibonacci retracement and extension levels for an NSE stock.
    Calculates 23.6%, 38.2%, 50%, 61.8% (Golden Pocket), 78.6%, and 161.8% extension.
    """
    sym = symbol.upper().strip()
    ticker_sym = sym if sym.endswith(".NS") else f"{sym}.NS"
    t = yf.Ticker(ticker_sym)
    df = t.history(period=period, interval="1d")

    if df.empty:
        return {"error": f"No data for {sym}"}

    swing_high = float(df["High"].max())
    swing_low = float(df["Low"].min())
    diff = swing_high - swing_low
    curr_price = float(df["Close"].iloc[-1])

    levels = {
        "0.0% (Swing Low)": round(swing_low, 2),
        "23.6% Retracement": round(swing_high - (diff * 0.236), 2),
        "38.2% Retracement": round(swing_high - (diff * 0.382), 2),
        "50.0% Neutral Retracement": round(swing_high - (diff * 0.500), 2),
        "61.8% Golden Ratio Retracement": round(swing_high - (diff * 0.618), 2),
        "78.6% Deep Retracement": round(swing_high - (diff * 0.786), 2),
        "100.0% (Swing High)": round(swing_high, 2),
        "127.2% Target Extension": round(swing_high + (diff * 0.272), 2),
        "161.8% Golden Extension": round(swing_high + (diff * 0.618), 2),
    }

    return {
        "symbol": sym,
        "currentPrice": round(curr_price, 2),
        "period": period,
        "swingHigh": round(swing_high, 2),
        "swingLow": round(swing_low, 2),
        "fibonacciLevels": levels
    }

@mcp.tool()
def position_sizer_nse(capital: float, risk_pct: float, entry_price: float, stop_loss: float) -> Dict[str, Any]:
    """
    Calculate professional position sizing for Indian market (INR) trades.
    Uses fixed fractional risk, calculates max shares, total outlay, and risk-reward targets.
    """
    if entry_price <= 0 or stop_loss <= 0 or entry_price == stop_loss:
        return {"error": "Invalid entry or stop loss price"}
    
    risk_per_share = abs(entry_price - stop_loss)
    max_risk_amount = capital * (risk_pct / 100.0)
    quantity = int(max_risk_amount // risk_per_share)
    total_capital_required = round(quantity * entry_price, 2)
    leverage_used = round(total_capital_required / capital, 2)

    is_long = entry_price > stop_loss
    target_1_5r = round(entry_price + (1.5 * risk_per_share) if is_long else entry_price - (1.5 * risk_per_share), 2)
    target_2r = round(entry_price + (2.0 * risk_per_share) if is_long else entry_price - (2.0 * risk_per_share), 2)
    target_3r = round(entry_price + (3.0 * risk_per_share) if is_long else entry_price - (3.0 * risk_per_share), 2)

    return {
        "accountCapitalINR": capital,
        "riskPercentage": f"{risk_pct}%",
        "maxRiskINR": round(max_risk_amount, 2),
        "entryPrice": entry_price,
        "stopLossPrice": stop_loss,
        "riskPerShareINR": round(risk_per_share, 2),
        "recommendedQuantity": quantity,
        "totalTradeValueINR": total_capital_required,
        "capitalAllocationPct": round((total_capital_required / capital) * 100, 2),
        "profitTargets": {
            "1.5R_Target": target_1_5r,
            "2.0R_Target": target_2r,
            "3.0R_Target": target_3r
        }
    }

def main():
    mcp.run()

if __name__ == "__main__":
    main()
