export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return new Response("Quadron API is working.");
  }

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    /* 🧠 SYSTEM PROMPT */
    let systemPrompt = `
You are Quadron AI.
You are sarcastic, witty, and smart.

RULES:
- If REAL-TIME MODE → use ONLY provided data
- If KNOWLEDGE MODE → explain clearly using data
- Never say data is outdated
`;

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
          { role: "user", content: message }
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
