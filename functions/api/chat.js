export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, mode } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let externalData = "";

    /* =========================
       🔵 EVALUATE MODE → SERPER ONLY
    ========================== */
    if (mode === "evaluate" && env.SERPER) {
      try {
        let q = message.toLowerCase();
        let smartQuery = message;

        // 🔥 SMART QUERY BOOST
        if (q.includes("tsla") || q.includes("tesla")) {
          smartQuery = "Tesla TSLA stock price today USD";
        }
        else if (q.includes("btc") || q.includes("bitcoin")) {
          smartQuery = "Bitcoin price today USD live";
        }
        else if (q.includes("eth")) {
          smartQuery = "Ethereum price today USD live";
        }
        else if (q.includes("nifty")) {
          smartQuery = "Nifty 50 today value India";
        }
        else if (q.includes("sensex")) {
          smartQuery = "Sensex today value India";
        }

        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": env.SERPER,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            q: smartQuery,
            gl: "in"
          })
        });

        const serperData = await serperRes.json();

        let parts = [];

        // 🔥 ANSWER BOX (BEST SOURCE)
        if (serperData.answerBox) {
          parts.push(
            `ANSWER: ${serperData.answerBox.answer || ""} ${serperData.answerBox.snippet || ""}`
          );
        }

        // 🔥 KNOWLEDGE GRAPH
        if (serperData.knowledgeGraph) {
          parts.push(
            `KNOWLEDGE: ${serperData.knowledgeGraph.title} - ${serperData.knowledgeGraph.description}`
          );
        }

        // 🔥 ORGANIC RESULTS
        if (serperData.organic?.length) {
          parts.push(
            serperData.organic
              .slice(0, 5)
              .map(r => `SOURCE: ${r.link}\n${r.snippet}`)
              .join("\n\n---\n\n")
          );
        }

        externalData = parts.join("\n\n");

        // 🔒 HARD FALLBACK (NO ESCAPE)
        if (!externalData) {
          externalData = "Limited data available. Extract best possible answer.";
        }

      } catch {
        externalData = "Search failed. Extract best possible answer from context.";
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

        externalData = wikiData?.extract || "No Wikipedia data found.";

      } catch {
        externalData = "Wikipedia fetch failed.";
      }
    }

    /* =========================
       🧠 SYSTEM PROMPTS
    ========================== */
    let systemPrompt = "";

    if (mode === "code") {
      systemPrompt = `
You are Quadron AI (Code Mode).

RULES:
- ONLY output code
- NO explanations
- ALWAYS wrap in triple backticks
`;
    }

    else if (mode === "evaluate") {
      systemPrompt = `
You are Quadron AI (Evaluate Mode).

ABSOLUTE RULES:
- You ALWAYS have real-time data
- Use ONLY provided DATA
- NEVER say "I don't have data"
- NEVER use prior knowledge
- Extract exact values if present
- Be direct and factual
`;
    }

    else if (mode === "explore") {
      systemPrompt = `
You are Quadron AI (Explore Mode).

RULES:
- Use ONLY Wikipedia data
- No real-time info
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
       🧾 FINAL USER MESSAGE
    ========================== */
    let finalUserMessage = message;

    if (mode === "evaluate" || mode === "explore") {
      finalUserMessage = `
DATA:
${externalData}

QUESTION:
${message}

INSTRUCTION:
Answer STRICTLY using DATA above.
Extract numbers if present.
`;
    }

    /* =========================
       🤖 GROQ CALL
    ========================== */
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        top_p: 1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserMessage }
        ]
      })
    });

    const aiData = await aiRes.json();

    let reply = aiData?.choices?.[0]?.message?.content || "No reply";

    /* =========================
       🔒 FORCE CODE MODE CLEAN
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
