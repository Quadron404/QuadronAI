const GROQ_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";
const MAX_SNIPPET_LENGTH = 2400;

const SYSTEM_PROMPT = `You are Quadron's automated background Shadow Auditor. Internally spin up two concurrent logical routines evaluating the incoming text snippet: Routine A (The Defamer) looks for catastrophic edge-case exploits, logic loops, or massive factual hallucinations. Routine B (The Shield) checks if the data aligns with structured technical reality. Synthesize their debate instantly. You must output a valid minified JSON payload matching this schema exactly: { "flaw": true/false, "sarcasticRiskMessage": "A sharp, biting, highly sarcastic single-sentence critique mocking their input choices if flaw is true, else an empty string." }`;

const emptyAudit = () => ({ flaw: false, sarcasticRiskMessage: "" });

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeAudit(value) {
  if (!value || typeof value !== "object" || value.flaw !== true) return emptyAudit();

  const message = typeof value.sarcasticRiskMessage === "string"
    ? value.sarcasticRiskMessage.trim().replace(/\s+/g, " ").slice(0, 360)
    : "";

  return message ? { flaw: true, sarcasticRiskMessage: message } : emptyAudit();
}

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return json({ error: "Expected an application/json request." }, 400);
  }

  let text;
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim().slice(-MAX_SNIPPET_LENGTH) : "";
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  if (!text) return json(emptyAudit());
  if (!env.GROQ_API_KEY) return json({ error: "Shadow Auditor is not configured." }, 503);

  try {
    const upstream = await fetch(GROQ_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GROQ_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!upstream.ok) return json({ error: "Shadow audit provider unavailable." }, 502);

    const completion = await upstream.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return json({ error: "Shadow audit returned an invalid response." }, 502);
    }

    return json(normalizeAudit(JSON.parse(content)));
  } catch {
    return json({ error: "Shadow audit failed." }, 502);
  }
}
