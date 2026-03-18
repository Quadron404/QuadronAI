// functions/api/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  // Handle GET (browser)
  if (request.method === "GET") {
    return new Response("Quadron API working. Use POST.", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
    }

    // 🔥 Call Groq API directly
    const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",   // ⚠️ changed to safer model
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await apiRes.json();

    // 🔍 DEBUG (IMPORTANT)
    if (!apiRes.ok) {
      return new Response(JSON.stringify({
        error: "Groq API error",
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
      success: true,
      data: [{ text: reply }]
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Server crash",
      message: err.message
    }), { status: 500 });
  }
}
