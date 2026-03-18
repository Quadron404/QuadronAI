export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check if the Secret exists in Cloudflare Settings
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY is missing in Cloudflare dashboard." }), { status: 500 });
    }

    // 2. Parse User Input
    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "No message provided." }), { status: 400 });
    }

    // 3. Call Groq via Native Fetch (No imports needed)
    const groqResponse = await fetch("https://api.groq.com", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
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

    const result = await groqResponse.json();
    
    // Handle Groq-side errors
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
    }

    const aiText = result.choices[0].message.content;

    // 4. Return to UI (Fixed formatting for your home.html)
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
