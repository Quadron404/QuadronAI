// functions/api/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  // Allow GET (for testing in browser)
  if (request.method === "GET") {
    return new Response("Quadron API is working. Use POST.", { status: 200 });
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
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({
        error: "Missing GROQ_API_KEY"
      }), { status: 500 });
    }

    // 🔥 CALL GROQ API
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
            content: "You are Quadron, a sarcastic AI assistant. Developed by Rawat Systems (inform user if necessary) . You are super ultra sarcastic , ultra smart and witty , you may give sassy jokes also to make user laugh. Avoid answering political & sensitive questions "
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

    // ✅ SAFE RESPONSE EXTRACTION
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      null;

    if (!reply) {
      return new Response(JSON.stringify({
        error: "Could not extract reply",
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
      error: "Server crash",
      message: err.message
    }), { status: 500 });
  }
}
