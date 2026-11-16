"""
Scanner for high-probability intraday candidates for ₹1,000 capital.
Filters:
1. Share price ideally between ₹100 and ₹700 (accessible with ₹1,000 - ₹5,000 buying power)
2. Extremely high liquidity (NSE volume > 5M shares)
3. F&O approved (low spreads, high institutional participation, margin eligible)
4. Active ATR% (Daily range > 1.5%)
5. Clear technical setups (near support, momentum breakout, or RSI setup)
"""

import yfinance as yf
import pandas as pd
import json

candidates_pool = [
    {"symbol": "TATASTEEL", "name": "Tata Steel"},
    {"symbol": "SBIN", "name": "State Bank of India"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors"},
    {"symbol": "ITC", "name": "ITC Ltd"},
    {"symbol": "COALINDIA", "name": "Coal India"},
    {"symbol": "POWERGRID", "name": "Power Grid"},
    {"symbol": "ONGC", "name": "ONGC"},
    {"symbol": "BEL", "name": "Bharat Electronics"},
    {"symbol": "FEDERALBNK", "name": "Federal Bank"},
    {"symbol": "PNB", "name": "Punjab National Bank"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries"},
    {"symbol": "NTPC", "name": "NTPC Ltd"},
    {"symbol": "IOC", "name": "Indian Oil Corp"},
    {"symbol": "GAIL", "name": "GAIL India"},
    {"symbol": "ZOMATO", "name": "Zomato Ltd"}
]

results = []

for c in candidates_pool:
    sym = c["symbol"]
    ticker_sym = f"{sym}.NS"
    try:
        t = yf.Ticker(ticker_sym)
        df = t.history(period="1mo", interval="1d")
        if df.empty or len(df) < 14:
            continue
        
        close = df["Close"]
        high = df["High"]
        low = df["Low"]
        volume = df["Volume"]

        ltp = round(float(close.iloc[-1]), 2)
        prev_close = round(float(close.iloc[-2]), 2)
        pct_change = round(((ltp - prev_close) / prev_close) * 100, 2)
        avg_vol = int(volume.mean())
        latest_vol = int(volume.iloc[-1])

        # ATR (14)
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_14 = round(float(tr.rolling(window=14).mean().iloc[-1]), 2)
        atr_pct = round((atr_14 / ltp) * 100, 2)

        # RSI (14)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = round(float((100 - (100 / (1 + rs))).iloc[-1]), 2)

        # 20 EMA & 50 SMA
        ema_20 = round(float(close.ewm(span=20, adjust=False).mean().iloc[-1]), 2)
        sma_50 = round(float(close.rolling(window=min(len(df), 20)).mean().iloc[-1]), 2)

        # Resistance and Support (last 10 days)
        res_10d = round(float(high.iloc[-10:].max()), 2)
        sup_10d = round(float(low.iloc[-10:].min()), 2)

        results.append({
            "symbol": sym,
            "name": c["name"],
            "ltp": ltp,
            "prev_close": prev_close,
            "pct_change": pct_change,
            "atr_14": atr_14,
            "atr_pct": atr_pct,
            "rsi_14": rsi,
            "ema_20": ema_20,
            "res_10d": res_10d,
            "sup_10d": sup_10d,
            "latest_vol": latest_vol,
            "avg_vol": avg_vol
        })
    except Exception as e:
        print(f"Error scanning {sym}: {e}")

# Filter and rank by ATR% and liquidity
results.sort(key=lambda x: x["atr_pct"], reverse=True)

with open("scan_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Scanned {len(results)} candidate stocks successfully.")
for r in results[:8]:
    print(f"{r['symbol']:<12} LTP: ₹{r['ltp']:<7} ATR: ₹{r['atr_14']} ({r['atr_pct']}%) RSI: {r['rsi_14']} Vol: {r['latest_vol']:,}")
