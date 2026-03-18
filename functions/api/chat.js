import { GroqClient } from 'groq-cloud-sdk';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Check if Secret is set in Cloudflare
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY missing in Cloudflare dashboard." }), { status: 500 });
    }

    // 2. Parse User Input
    const { message } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), { status: 400 });
    }

    // 3. Initialize Groq
    const client = new GroqClient({
      apiKey: env.GROQ_API_KEY,
    });

    const systemPrompt = "You are Quadron, a sarcastic AI.";

    // 4. Call Groq API
    const data = await client.inference({
      model: 'gpt-oss-120b', 
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });

    const reply = data.output ? data.output.join("\n") : "Quadron couldn't respond";

    // 5. Return JSON in the format the frontend expects
    return new Response(JSON.stringify({
      success: true,
      data:
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "GROQ API request failed",
      message: err.message
    }), { status: 500 });
  }
}
