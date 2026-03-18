export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check for API Key in Cloudflare Secrets
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare dashboard." }), { status: 500 });
    }

    // 2. Parse User Input
    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "Message is required." }), { status: 400 });
    }

    // 3. Call Groq API via Native Fetch
    const groqResponse = await fetch("https://api.groq.com", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await groqResponse.json();

    // 4. Extract AI text and return to UI
    const aiReply = data.choices?.[0]?.message?.content || "Quadron is silent.";

    return new Response(JSON.stringify({
      success: true,
      data:
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: "API request failed", 
      message: err.message 
    }), { status: 500 });
  }
}
