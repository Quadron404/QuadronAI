export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, evaluate } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let priceData = null;
    let tavilyContent = "";
    let isFinance = false;

    const msg = message.toLowerCase();

    /* 🔎 FINANCE DETECTION */
    const financeKeywords = [
      "btc","bitcoin","eth","crypto","price","stock",
      "share","market","trading","forex","nifty","sensex"
    ];

    isFinance = financeKeywords.some(k => msg.includes(k));

    /* 🌐 TAVILY (TEXT DATA FOR ALL QUERIES IN EVALUATE MODE) */
    if (evaluate && env.TAVILY__API) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.TAVILY__API,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: message,
            max_results: 3
          })
        });

        const tavilyData = await tavilyRes.json();

        if (tavilyData?.results) {
          tavilyContent = tavilyData.results
            .map(r => r.content)
            .join("\n\n");
        }

      } catch {
        tavilyContent = "";
      }
    }

    /* 📊 TWELVE DATA (ONLY IF FINANCE) */
    if (evaluate && isFinance && env.twelve__KEY) {
      try {
        let symbol = null;

        if (msg.includes("eth")) symbol = "ETH/USD";
        else if (msg.includes("btc") || msg.includes("bitcoin")) symbol = "BTC/USD";
        else if (msg.includes("apple")) symbol = "AAPL";
        else if (msg.includes("tesla")) symbol = "TSLA";
        else if (msg.includes("reliance")) symbol = "RELIANCE.NSE";

        if (symbol) {
          const tdRes = await fetch(
            `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1h&outputsize=24&apikey=${env.twelve__KEY}`
          );

          const tdData = await tdRes.json();

          if (tdData?.values) {
            priceData = tdData.values.reverse();
          }
        }

      } catch {
        priceData = null;
      }
    }

    /* 🧠 AI RESPONSE */
    const textRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `
You are Quadron AI.

RULES:
- If real-time data is provided → ONLY use that
- Write 3 paragraphs
- Maintain clarity and structure
- If financial data present → explain trends
`
          },
          {
            role: "user",
            content: tavilyContent
              ? `Use ONLY this real-time data:\n${tavilyContent}`
              : message
          }
        ]
      })
    });

    const textData = await textRes.json();

    const reply =
      textData?.choices?.[0]?.message?.content || "No reply";

    return new Response(JSON.stringify({
      reply,
      prices: priceData,
      showGraph: !!priceData
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
