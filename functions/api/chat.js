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

    /* 🔎 REAL GRAPH DATA (TWELVE DATA) */
    if (evaluate && env.twelve__KEY) {
      try {
        // extract crypto symbol (basic)
        let symbol = "BTC/USD";
        if (message.toLowerCase().includes("eth")) symbol = "ETH/USD";
        if (message.toLowerCase().includes("bitcoin")) symbol = "BTC/USD";

        const tdRes = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1h&outputsize=24&apikey=${env.twelve__KEY}`
        );

        const tdData = await tdRes.json();

        if (tdData?.values) {
          priceData = tdData.values.reverse(); // oldest → newest
        }

      } catch {
        priceData = null;
      }
    }

    /* 🧠 AI TEXT RESPONSE */
    const textRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
You are Quadron AI.

RULES:
- Write EXACTLY 3 paragraphs
- Each paragraph ~120–150 words
- Be clear and structured
- If financial data is given → explain trend
`
          },
          {
            role: "user",
            content: evaluate && priceData
              ? `Analyze this price data:\n${JSON.stringify(priceData)}`
              : message
          }
        ]
      })
    });

    const textData = await textRes.json();
    const reply =
      textData?.choices?.[0]?.message?.content || "No reply";

    /* 📊 SEND RAW DATA TO FRONTEND */
    return new Response(JSON.stringify({
      reply,
      prices: priceData
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
