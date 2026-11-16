/**
 * TradeMind AI - Google Gemini API Integration Module
 * Connects directly to Google Generative Language API using the user's private API Key.
 * For security, the key is stored privately in the user's browser localStorage and never exposed in git.
 */

const GeminiAI = {
  models: [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest"
  ],

  getApiKey() {
    try {
      const stored = localStorage.getItem("trademind_gemini_api_key");
      return stored && stored.trim() ? stored.trim() : "";
    } catch (e) {
      return "";
    }
  },

  setApiKey(newKey) {
    if (newKey && newKey.trim()) {
      localStorage.setItem("trademind_gemini_api_key", newKey.trim());
    }
  },

  isConfigured() {
    return Boolean(this.getApiKey());
  },

  // Call Gemini API with automatic model fallback
  async generateAnalysis(userQuery, stockContext = null, capital = 1000) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error("No Gemini API key configured in localStorage.");
    }

    const systemPrompt = `You are TradeMind AI, an elite institutional quantitative trader specializing in Indian National Stock Exchange (NSE/BSE) equities.
You strictly protect small retail accounts (Account Capital: ₹${capital.toLocaleString()} INR).

CORE RISK RULES TO ENFORCE IN EVERY RESPONSE:
1. Max Risk per trade is STRICTLY 1.5% (Max ₹15 loss on ₹1,000). Never recommend taking more than ₹15 risk.
2. Product is Intraday MIS (5x Leverage = ₹${(capital * 5).toLocaleString()} buying power).
3. The VWAP Anchor Rule: NEVER buy green breakout spikes at the 9:15 AM open when price is >1.5% above VWAP or RSI > 70 (Explain that institutions use morning liquidity to distribute).
4. Only recommend buying on a pullback to the VWAP anchor where Supertrend (10,3) is Bullish (Green).
5. Always state: Entry Price, Hard Stop-Loss Price, Target 1 (1:2 R:R), Target 2, Exact Share Quantity, and Net Profit after NSE taxes (Brokerage ₹20/0.05%, STT 0.025%, GST 18%).
6. Be concise, direct, objective, and mathematical. Format with bold markdown and clean bullet points.`;

    let userPromptText = userQuery;
    if (stockContext) {
      userPromptText = `User Query: "${userQuery}"
Live NSE Market Context:
- Symbol: ${stockContext.symbol} (${stockContext.name}, ${stockContext.sector})
- LTP: ₹${stockContext.price.toFixed(2)}
- Intraday VWAP: ₹${stockContext.vwap.toFixed(2)}
- Supertrend (10,3): ₹${stockContext.supertrend ? stockContext.supertrend.toFixed(2) : 'N/A'} (${stockContext.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'})
- 14-period RSI: ${stockContext.rsi}
- Daily ATR: ₹${stockContext.atr}
- Confluence Score: ${stockContext.confluenceScore}%
- Account Capital: ₹${capital.toLocaleString()} INR

Provide a concise, professional institutional quant recommendation with exact levels, risk sizing, and trap analysis.`;
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPromptText}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 650
      }
    };

    let lastError = null;
    for (const model of this.models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates && data.candidates[0];
          const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0].text;
          if (text) {
            return {
              text: text.trim(),
              model,
              success: true
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData.error ? errData.error.message : `HTTP ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || "All Gemini models unavailable.");
  }
};

window.GeminiAI = GeminiAI;
