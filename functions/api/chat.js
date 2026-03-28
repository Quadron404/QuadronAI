export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, mode, user } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let externalData = "";

    /* =========================
   🔵 EVALUATE MODE → TAVILY ONLY (FIXED)
========================= */
if (mode === "evaluate" && env.TAVILY__KEY) {
  try {

    // 🔥 SMART QUERY FIX
    let smartQuery = message;

    if (message.toLowerCase().includes("tsla")) {
      smartQuery = "Tesla TSLA stock price today current value";
    }

    if (message.toLowerCase().includes("bitcoin") || message.toLowerCase().includes("btc")) {
      smartQuery = "Bitcoin price today live";
    }

    if (message.toLowerCase().includes("india pm")) {
      smartQuery = "current prime minister of India";
    }

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.TAVILY__KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: smartQuery,
        max_results: 5,
        search_depth: "advanced"   // 🔥 IMPORTANT
      })
    });

    const tavilyData = await tavilyRes.json();

    if (tavilyData?.results?.length) {
      externalData = tavilyData.results
        .map(r => r.content)
        .join("\n\n");
    } else {
      // 🔥 FALLBACK FIX
      externalData = "No strong data found. Use general knowledge to answer accurately.";
    }

  } catch {
    externalData = "Data fetch failed. Use best possible reasoning.";
  }
}
    /* =========================
       🟡 EXPLORE MODE → WIKIPEDIA ONLY
    ========================== */
    if (mode === "explore") {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(message)}`
        );

        const wikiData = await wikiRes.json();

        if (wikiData?.extract) {
          externalData = wikiData.extract;
        } else {
          externalData = "No Wikipedia data found.";
        }

      } catch {
        externalData = "Failed to fetch Wikipedia data.";
      }
    }

    /* =========================
       🧠 SYSTEM PROMPTS (HARD ENFORCED)
    ========================== */
    let systemPrompt = "";

    if (mode === "code") {
      systemPrompt = `
You are Quadron AI (Code Mode).

STRICT RULES:
- ONLY output code
- NO explanations
- NO text
- ALWAYS wrap in triple backticks
`;
    }

    else if (mode === "evaluate") {
      systemPrompt = `
You are Quadron AI (Evaluate Mode).

CRITICAL RULES:
- You are GIVEN real-time data ALWAYS
- You MUST use ONLY that data
- NEVER say "I don't have data"
- NEVER use prior knowledge
- NEVER mention Tavily
- Answer directly from given data
- If data is limited, still answer using it
`;
    }

    else if (mode === "explore") {
      systemPrompt = `
You are Quadron AI (Explore Mode).

RULES:
- Use ONLY Wikipedia data
- No real-time claims
- Clear explanation
`;
    }

    else {
      systemPrompt = `
You are Quadron AI.

Be slightly sarcastic and clear.
`;
    }

    /* =========================
       🧾 FINAL USER MESSAGE (FORCED DATA INJECTION)
    ========================== */
    let finalUserMessage = message;

    if (mode === "evaluate" || mode === "explore") {
      finalUserMessage = `
DATA (MANDATORY TO USE):
${externalData}

USER QUESTION:
${message}

INSTRUCTION:
Answer STRICTLY using DATA above.
`;
    }

    /* =========================
       🤖 GROQ CALL (DETERMINISTIC)
    ========================== */
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,   // 🔥 CRITICAL FIX
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserMessage }
        ]
      })
    });

    const aiData = await aiRes.json();

    let reply = aiData?.choices?.[0]?.message?.content || "No reply";

    /* =========================
       🔒 FORCE CLEAN CODE MODE
    ========================== */
    if (mode === "code") {
      if (!reply.includes("```")) {
        reply = "```html\n" + reply + "\n```";
      }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
