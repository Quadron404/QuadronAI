// functions/api/chat.js

export async function onRequest(context) {
  const { request, env } = context;

  // Handle GET (so browser won't show login page)
  if (request.method === "GET") {
    return new Response(
      "Quadron AI endpoint working. Use POST with { message: '...' }",
      { status: 200 }
    );
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST only" }),
      { status: 405 }
    );
  }

  try {
    const body = await request.json();
    const message = body.message;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message required" }),
        { status: 400 }
      );
    }

    if (!env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY" }),
        { status: 500 }
      );
    }

    // 🔥 REAL GROQ API CALL (CORRECT FORMAT)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // reliable working model
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    // ✅ CORRECT RESPONSE EXTRACTION
    const reply =
      data?.choices?.[0]?.message?.content || "No response from AI";

    return new Response(
      JSON.stringify({ success: true, data: [{ text: reply }] }),
      { status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: err.message
      }),
      { status: 500 }
    );
  }
}
