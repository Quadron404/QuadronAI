export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { message } = await context.request.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Quadron AI, sarcastic and smart." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify({
      reply: data.choices?.[0]?.message?.content || "No response"
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500
    });
  }
}
