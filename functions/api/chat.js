export async function onRequest(context) {
  // Allow only POST
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method Not Allowed",
      hint: "Use POST request"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Parse user input
    let body;
    try {
      body = await context.request.json();
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Invalid JSON body",
        details: e.message
      }), { status: 400 });
    }

    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({
        error: "No message provided"
      }), { status: 400 });
    }

    // Check API key
    const apiKey = context.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "Missing GROQ_API_KEY",
        fix: "Go to Cloudflare Pages → Settings → Environment Variables → Add GROQ_API_KEY"
      }), { status: 500 });
    }

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Quadron AI, sarcastic, smart, futuristic." },
          { role: "user", content: message }
        ]
      })
    });

    // If API fails
    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({
        error: "Groq API request failed",
        status: response.status,
        details: errText
      }), { status: 500 });
    }

    // Parse API response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Failed to parse API response",
        details: e.message
      }), { status: 500 });
    }

    // Extract reply safely
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return new Response(JSON.stringify({
        error: "No reply from AI",
        full_response: data
      }), { status: 500 });
    }

    // SUCCESS
    return new Response(JSON.stringify({
      reply: reply
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    // Catch ANY unexpected error
    return new Response(JSON.stringify({
      error: "Server crash",
      details: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
