export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check if the secret exists
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare settings." }), { status: 500 });
    }

    // 2. Parse User Input
    const { message } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), { status: 400 });
    }

    // 3. Call Groq via Native Fetch (No imports needed)
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
          { role: "user", content: message }
        ]
      })
    });

    const data = await groqResponse.json();
    
    // Check if Groq returned an error
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500 });
    }

    const reply = data.choices[0]?.message?.content || "Quadron is speechless.";

    // 4. Return formatted response to UI
    return new Response(JSON.stringify({
      success: true,
      data:
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Connection to AI failed",
      message: err.message
    }), { status: 500 });
  }
}
