export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return new Response("Quadron API is working.");
  }

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, evaluate, explore } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let finalMessage = message;

    /* 🔴 EVALUATE MODE (TAVILY) */
    if (evaluate) {
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

        const content = tavilyData?.results?.map(r => r.content).join("\n");

        if (!content || content.length < 20) {
          return new Response(JSON.stringify({
            error: "Real-time fetch failed (Tavily)"
          }), { status: 200 });
        }

        finalMessage = `
REAL-TIME MODE

Use ONLY this data:
${content}

Give precise answer.
`;

      } catch {
        return new Response(JSON.stringify({
          error: "Tavily fetch crashed"
        }), { status: 200 });
      }
    }

    /* 🟢 EXPLORE MODE (WIKIPEDIA) */
    if (explore) {
      try {
        const wikiRes = await fetch(
          "https://en.wikipedia.org/api/rest_v1/page/summary/" +
          encodeURIComponent(message)
        );

        const wikiData = await wikiRes.json();

        if (!wikiData.extract) {
          return new Response(JSON.stringify({
            error: "No Wikipedia data found"
          }), { status: 200 });
        }

        finalMessage = `
KNOWLEDGE MODE

Wikipedia Data:
${wikiData.extract}

Explain clearly.
`;

      } catch {
        return new Response(JSON.stringify({
          error: "Wikipedia fetch failed"
        }), { status: 200 });
      }
    }

    /* 🧠 SYSTEM PROMPT */
    let systemPrompt = `
You are Quadron AI.
You are sarcastic, witty, and smart.

RULES:
- REAL-TIME MODE → ONLY use given data
- KNOWLEDGE MODE → explain clearly
- Never say data is outdated
- Be confident and useful
`;

    /* 🔥 GROQ CALL */
    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalMessage }
        ]
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return new Response(JSON.stringify({
        error: "Groq API failed",
        details: data
      }), { status: 500 });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "No reply";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
