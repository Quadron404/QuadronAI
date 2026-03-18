export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check for API Key
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare settings." }), { status: 500 });
    }

    // 2. Parse User Input
    const body = await request.json();
    const userMsg = body.message;

    if (!userMsg) {
      return new Response(JSON.stringify({ error: "No message sent." }), { status: 400 });
    }

    // 3. Direct Fetch to Groq (No library needed)
    const groqResponse = await fetch("https://api.groq.com", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are Quadron, a sarcastic AI." },
          { role: "user", content: userMsg }
        ]
      })
    });

    const result = await groqResponse.json();

    // Check for API errors
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
    }

    const aiText = result.choices[0].message.content;

    // 4. Return to UI
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
