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
       🔵 EVALUATE MODE → TAVILY ONLY
    ========================== */
    if (mode === "evaluate" && env.TAVILY__KEY) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.TAVILY__KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: message,
            max_results: 5
          })
        });

        const tavilyData = await tavilyRes.json();

        if (tavilyData?.results) {
          externalData = tavilyData.results
            .map(r => r.content)
            .join("\n\n");
        }

      } catch {
        externalData = "";
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
        }

      } catch {
        externalData = "";
      }
    }

    /* =========================
       🧠 SYSTEM PROMPTS
    ========================== */
    let systemPrompt = "";

    if (mode === "code") {
      systemPrompt = `
You are Quadron AI (Code Mode).

STRICT RULES:
- ONLY output code
- NO explanations
- NO text
- NO comments unless part of code
- ALWAYS return inside triple backticks
`;
    }

    else if (mode === "evaluate") {
      systemPrompt = `
You are Quadron AI (Evaluate Mode).

STRICT RULES:
- Use ONLY provided real-time data
- DO NOT use Wikipedia
- DO NOT use prior knowledge
- Be factual and structured
- No hallucinations
`;
    }

    else if (mode === "explore") {
      systemPrompt = `
You are Quadron AI (Explore Mode).

STRICT RULES:
- Use ONLY Wikipedia data provided
- Explain clearly
- No real-time claims
`;
    }

    else {
      systemPrompt = `
You are Quadron AI.

Be helpful, slightly sarcastic, and clear.
`;
    }

    /* =========================
       🧾 FINAL USER MESSAGE
    ========================== */
    let finalUserMessage = message;

    if (externalData) {
      finalUserMessage = `
Use ONLY this data:

${externalData}

User Question: ${message}
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
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: finalUserMessage
          }
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
