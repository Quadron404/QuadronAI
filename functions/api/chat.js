export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Validate API Key
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare." }), { status: 500 });
    }

    // 2. Parse User Message
    const body = await request.json();
    if (!body.message) {
      return new Response(JSON.stringify({ error: "No message found." }), { status: 400 });
    }

    // 3. Call Groq API via Fetch
    const groqResponse = await fetch("https://api.groq.com", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: body.message }
        ]
      })
    });

    const result = await groqResponse.json();
    
    // 4. Extract Text
    const aiReply = result.choices && result.choices[0] ? result.choices[0].message.content : "Quadron is silent.";

    // 5. Return JSON to UI (Fixed the empty 'data' field here)
    return new Response(JSON.stringify({
      success: true,
      data:
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server Error", details: err.message }), { status: 500 });
  }
}
