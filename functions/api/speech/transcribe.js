const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.GROQ_API_KEY) return json({ error: "GROQ_API_KEY is not configured." }, 503);
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || !audio.size) return json({ error: "An audio recording is required." }, 400);
    if (audio.size > 25 * 1024 * 1024) return json({ error: "Audio must be under 25 MB." }, 413);
    const upstreamForm = new FormData();
    upstreamForm.append("file", audio, audio.name || "recording.webm");
    upstreamForm.append("model", "whisper-large-v3-turbo");
    upstreamForm.append("response_format", "json");
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${env.GROQ_API_KEY}` }, body: upstreamForm });
    const data = await response.json();
    if (!response.ok) return json({ error: data?.error?.message || "Transcription failed." }, response.status);
    return json({ text: data.text || "" });
  } catch (error) { return json({ error: error.message || "Transcription failed." }, 500); }
}
