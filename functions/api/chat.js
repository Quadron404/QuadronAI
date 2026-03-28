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
   🔵 EVALUATE MODE → SERPER CLEANED
========================= */
if (mode === "evaluate" && env.SERPER) {
  try {
    let q = message.toLowerCase();
    let smartQuery = message;

    if (q.includes("tsla") || q.includes("tesla")) {
      smartQuery = "Tesla TSLA stock price today USD";
    }
    else if (q.includes("btc") || q.includes("bitcoin")) {
      smartQuery = "Bitcoin price today USD";
    }
    else if (q.includes("eth")) {
      smartQuery = "Ethereum price today USD";
    }
    else if (q.includes("india pm")) {
      smartQuery = "current prime minister of India";
    }
    else if (q.includes("us president")) {
      smartQuery = "current US president 2026";
    }

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": env.SERPER,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: smartQuery })
    });

    const data = await res.json();

    let extracted = [];

    /* 🔥 ANSWER BOX FIRST */
    if (data.answerBox?.answer) {
      extracted.push(data.answerBox.answer);
    }
    if (data.answerBox?.snippet) {
      extracted.push(data.answerBox.snippet);
    }

    /* 🔥 ORGANIC CLEAN FILTER */
    if (data.organic) {
      for (let r of data.organic.slice(0, 5)) {
        let text = r.snippet;

        // ❌ remove junk numbers (long IDs etc)
        text = text.replace(/\b\d{6,}\b/g, "");

        extracted.push(text);
      }
    }

    externalData = extracted.join("\n");

    if (!externalData) {
      externalData = "No clear data found. Give best logical answer.";
    }

  } catch {
    externalData = "Search failed. Answer logically.";
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
