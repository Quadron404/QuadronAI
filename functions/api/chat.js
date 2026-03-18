// functions/api/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  // Allow browser test
  if (request.method === "GET") {
    return new Response("Quadron API is live. Use POST.", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400
      });
    }

    // ✅ Ensure API key exists
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({
        error: "Missing GROQ_API_KEY in Cloudflare"
      }), { status: 500 });
    }

    // 🔥 GROQ API CALL
    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are Quadron, a sharp, sarcastic AI assistant. Keep responses witty but useful."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await apiRes.json();

    // ❌ Show real Groq error
    if (!apiRes.ok) {
      return new Response(JSON.stringify({
        error: "Groq API failed",
        status: apiRes.status,
        details: data
      }), { status: 500 });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return new Response(JSON.stringify({
        error: "Empty AI response",
        full: data
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      reply: reply
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Server error",
      message: err.message
    }), { status: 500 });
  }
}
