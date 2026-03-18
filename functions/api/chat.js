// functions/api/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return new Response("Quadron API working", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    // 🔍 DEBUG: check if API key exists
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({
        error: "GROQ_API_KEY is missing in Cloudflare"
      }), { status: 500 });
    }

    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await apiRes.json();

    // 🔥 SHOW REAL ERROR FROM GROQ
    if (!apiRes.ok) {
      return new Response(JSON.stringify({
        error: "Groq API failed",
        status: apiRes.status,
        details: data
      }), { status: 500 });
    }

    const reply = data?.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({
      success: true,
      data: [{ text: reply || "No reply text" }]
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Server crash",
      message: err.message
    }), { status: 500 });
  }
}
