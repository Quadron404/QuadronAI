const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";
const HARMFUL_PATTERNS = [
  /\b(kill|murder|slaughter|assassinate)\s+(yourself|me|him|her|them|everyone|the\s+.*)\b/i,
  /\b(commit|attempt)(\w+)?\s+suicide|suicidal|end\s+(my|your)\s+life|take\s+(my|your)\s+own\s+life|(kill|cut|hurt|harm)\s+(myself|yourself)|self[\s-]?harm|want(s|ed)?\s+to\s+die/i,
  /\b(make|build|how\s+to\s+make)\s+(a|an)?\s*(bomb|pipe\s+bomb|napalm|ricin|sar(?:in|an)|explosive\s+devices?)\b/i,
  /\b(rape|sexual\s+assault|groom(e|ing)?\s+a\s+minor)\b/i
];
const isHarmful = text => HARMFUL_PATTERNS.some(pattern => pattern.test(text));

const historyTool = {
  type: "function",
  function: {
    name: "history",
    description: "Private long-term memory. It is NOT injected into every reply. Use action=get when the user refers to past preferences, facts, plans, or prior conversations and you need that context. Use action=save only for durable, user-approved or clearly useful facts/preferences; never save secrets, passwords, payment data, or sensitive personal data. Keep memories concise.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "save", "forget"], description: "get retrieves the user's saved memories; save adds one durable memory; forget removes a memory by id." },
        memory: { type: "string", description: "Concise durable memory to save, required for save." },
        memory_id: { type: "string", description: "Memory id to remove, required for forget." }
      },
      required: ["action"]
    }
  }
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" } });

function database(env) {
  return env.HISTORY_DB || env.QUADRON_DB || env.DB || null;
}

async function history(db, userId, args) {
  if (!db) return { ok: false, error: "Long-term memory is not configured." };
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS quadron_memories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    if (args.action === "get") {
      const { results = [] } = await db.prepare("SELECT id, content, created_at FROM quadron_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 40").bind(userId).all();
      return { ok: true, memories: results };
    }
    if (args.action === "save") {
      const content = typeof args.memory === "string" ? args.memory.trim().slice(0, 800) : "";
      if (!content) return { ok: false, error: "A non-empty memory is required." };
      const id = crypto.randomUUID();
      await db.prepare("INSERT INTO quadron_memories (id, user_id, content, created_at) VALUES (?, ?, ?, ?)").bind(id, userId, content, new Date().toISOString()).run();
      return { ok: true, saved: { id, content } };
    }
    if (args.action === "forget") {
      const id = typeof args.memory_id === "string" ? args.memory_id : "";
      await db.prepare("DELETE FROM quadron_memories WHERE id = ? AND user_id = ?").bind(id, userId).run();
      return { ok: true, forgotten: id };
    }
    return { ok: false, error: "Unknown history action." };
  } catch (error) {
    return { ok: false, error: `History unavailable: ${error.message}` };
  }
}

function systemPrompt(mode) {
  const base = `You are Quadron, a precise, calm, capable AI assistant. Be direct and useful. If current or niche information would improve the answer, use browser_search. You have a HISTORY tool for on-demand long-term user memory; it is private and empty until retrieved. Do not claim you retrieved or stored a memory unless the tool actually confirms it. Never expose tool internals.`;
  if (mode === "code") return `${base}\nFor programming requests, prioritize correct, runnable solutions and explain only what is needed.`;
  if (mode === "evaluate") return `${base}\nEvaluate claims critically. Distinguish facts, assumptions, and uncertainty. Use browser search for time-sensitive claims.`;
  return base;
}

export async function onRequestPost({ request, env }) {
  if (!env.GROQ_API_KEY) return json({ error: "GROQ_API_KEY is not configured." }, 503);
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 16000) : "";
    if (!message) return json({ error: "A message is required." }, 400);
    if (isHarmful(message)) return json({ reply: "I can’t help with harming people or creating dangerous weapons. If someone may be in immediate danger, contact local emergency services now.", blocked: true });
    const userId = typeof body.userId === "string" && body.userId.length <= 128 ? body.userId : "anonymous";
    const recent = Array.isArray(body.history) ? body.history.slice(-10).filter(x => x && typeof x.content === "string").map(x => ({ role: x.role === "assistant" || x.role === "ai" ? "assistant" : "user", content: x.content.slice(0, 6000) })) : [];
    const messages = [{ role: "system", content: systemPrompt(body.mode) }, ...recent, { role: "user", content: message }];
    const tools = [historyTool, { type: "browser_search" }];
    let usedSearch = false;

    for (let turn = 0; turn < 4; turn++) {
      const upstream = await fetch(GROQ_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, temperature: 0.35, reasoning_effort: "low", messages, tools, tool_choice: "auto" })
      });
      const payload = await upstream.json();
      if (!upstream.ok) return json({ error: payload?.error?.message || "Groq request failed." }, upstream.status);
      const answer = payload?.choices?.[0]?.message;
      if (!answer) return json({ error: "Groq returned no response." }, 502);
      if (!answer.tool_calls?.length) return json({ reply: answer.content || "I could not generate a response.", usedSearch, model: MODEL });
      messages.push({ role: "assistant", content: answer.content || null, tool_calls: answer.tool_calls });
      for (const call of answer.tool_calls) {
        if (call.type === "browser_search") { usedSearch = true; continue; }
        if (call.function?.name !== "history") continue;
        let args = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = {}; }
        const result = await history(database(env), userId, args);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    return json({ error: "The assistant exceeded its tool-call limit. Please try again." }, 502);
  } catch (error) {
    return json({ error: error.message || "Invalid request." }, 500);
  }
}
