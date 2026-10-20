export async function onRequestPost({ request, env }) {
  if (!env.GROQ_API_KEY) return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured." }), { status: 503, headers: { "content-type": "application/json" } });
  try {
    const { text, voice = "tara" } = await request.json();
    const input = typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, 200) : "";
    if (!input) return new Response(JSON.stringify({ error: "Text is required." }), { status: 400, headers: { "content-type": "application/json" } });
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/speech", { method: "POST", headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: "canopylabs/orpheus-v1-english", voice, input, response_format: "wav" }) });
    if (!upstream.ok) return new Response(JSON.stringify({ error: "Speech generation failed." }), { status: upstream.status, headers: { "content-type": "application/json" } });
    return new Response(upstream.body, { headers: { "content-type": upstream.headers.get("content-type") || "audio/wav", "cache-control": "no-store" } });
  } catch (error) { return new Response(JSON.stringify({ error: error.message || "Speech generation failed." }), { status: 500, headers: { "content-type": "application/json" } }); }
}
