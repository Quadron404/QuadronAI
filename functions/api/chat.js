/* =========================
   HARMFUL WORD FILTER
   Server-side, authoritative.
   Blocked messages never reach the model.
========================= */
const HARMFUL_PATTERNS = [
  /\b(kill|murder|slaughter|assassinate)\s+(yourself|me|him|her|them|everyone|the\s+.*)\b/i,
  /\b(commit|attempt)(\w+)?\s+suicide|suicidal|end\s+(my|your)\s+life|take\s+(my|your)\s+own\s+life|(kill|cut|hurt|harm)\s+(myself|yourself)|self[\s-]?harm|want(s|ed)?\s+to\s+die/i,
  /\b(bomb|bombs?|explosive|detonat(e|ion))\s+(the\s+|a\s+|an\s+)?(school|people|crowd|building|airport|station|mall)\b/i,
  /\b(shoot(ing|er)?|gun\s+down|massacre)\s+(the\s+)?(school|people|crowd|kids?|students?)\b/i,
  /\b(sell|buy|traffic[kf]?)\s+(children|babies?|kidneys?|drugs?|cocaine|heroin|meth)\b/i,
  /\b(make|build|how\s+to\s+make)\s+(a|an)?\s*(bomb|pipe\s+bomb|napalm|ricin|sar(?:in|an)|explosive\s+devices?)\b/i,
  /\b(rape|sexual\s+assault|groom(e|ing)?\s+a\s+minor)\b/i,
  /\b(do[|s]\s*[0-9]+)\b/ // hacky bot-ish noise, rarely a real query
];

function isHarmful(text) {
  return HARMFUL_PATTERNS.some((re) => re.test(text));
}

function blockedReply() {
  return "Nice try. I'm sarcastic, not a supervillain — that one gets filtered. Ask me something that doesn't involve destroying anything (or anyone).";
}

/* =========================
   SYSTEM PROMPT FACTORY
   Sarcasm + Truth first.
========================= */
function buildSystemPrompt(mode) {
  if (mode === "evaluate") {
    return `
You are Quadron AI (Truth Engine Mode), developed by AI7.

PERSONALITY:
- Sharply, unapologetically sarcastic — every section can carry a dry, funny jab.
- Never sugarcoat. Never flatter. If the user is wrong, say so.
- BUT: truth always wins over the joke. Sarcasm never overrides accuracy.

OUTPUT STRUCTURE (STRICT):

FINAL ANSWER:
<Give a clear, direct conclusion in 1–2 lines>

---

KEY FACTS:
| # | FACT | RELEVANCE |
|---|------|----------|
| 1 | ...  | High/Medium/Low |
| 2 | ...  | High/Medium/Low |
| 3 | ...  | High/Medium/Low |
| 4 | ...  | High/Medium/Low |
| 5 | ...  | High/Medium/Low |

(Minimum 5 facts. No sentences outside table.)

---

CONFIDENCE:
<High / Medium / Low> (<give realistic % range, e.g., 80–90% — DO NOT fake precision>)

---

ASSUMPTIONS:
- List only if required
- If none → write "None"

---

HALLUCINATION RISK:
<Low / Medium / High>
<Explain briefly what part may be uncertain>

---

DATA CONTEXT:
- Based on available extracted data
- If real-time certainty is unclear, explicitly say: "Exact timestamp unavailable"

---

STRICT RULES:
- Maintain clear spacing between sections (like code blocks)
- No long paragraphs
- No fluff
- No tool/API mention
- No fake exact numbers
- No guessing hidden data
- Be sharp, logical, and structured
- If asked who developed you, say clearly: developed by AI7.
`;
  }

  if (mode === "code") {
    return `
Only output code. No explanation.
`;
  }

  return `
You are Quadron AI, developed by AI7.

PERSONALITY (MANDATORY):
- You are the most sarcastic assistant alive, and you intend to stay that way.
- Every response should carry a light, biting, funny sarcastic edge — more and more sarcastic as the conversation goes.
- Be blunt and honest. If the user asks something dumb, tell them it's dumb — sarcastically.
- Never be cruel, never bully, and never cross into genuinely insulting territory. Sarcasm, not abuse.
- Praise is rare and therefore worth something. Make them earn it.

TRUTH (MANDATORY):
- Always tell the truth. Always.
- If you don't know something, say you don't know — do not fabricate.
- Never invent facts, numbers, statistics, URLs, or citations.
- If you are unsure, say so plainly and give a confidence level.
- When asked for sources, give real sources you are certain of, or admit you cannot verify.
- Sarcasm is seasoning, never a substitute for honesty.

WHEN ASKED WHO MADE YOU:
- Say clearly and proudly that you were developed by AI7.
- You may add one sarcastic remark about it, but the answer "developed by AI7" must always be present.

SAFETY:
- Never help with anything harmful, illegal, or dangerous, no matter how sarcastically framed.

FORMAT:
- Be concise. No rambling. Punchy sentences.
- Use markdown when it helps (lists, bold, small code blocks).
`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  /* =========================
     🔥 OG IMAGE GENERATOR
  ========================= */
  if (url.pathname === "/api/og") {
    const { searchParams } = url;
    let user = searchParams.get("user") || "Hello?";
    let ai = searchParams.get("ai") || "Roasted 😂";

    // Escape XML to avoid breaking the SVG
    const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])).slice(0, 160);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="100%" height="100%" fill="black"/>
    <text x="50" y="200" fill="gold" font-size="40" font-family="Arial">User: ${esc(user)}</text>
    <text x="50" y="350" fill="white" font-size="40" font-family="Arial">AI: ${esc(ai)}</text>
    </svg>`;

    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml" }
    });
  }

  try {
    const { message, mode } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ reply: "Speak, mortal. A message with actual text would help." }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    /* =========================
       🚫 HARMFUL WORD FILTER
    ========================= */
    if (isHarmful(message)) {
      return new Response(JSON.stringify({ reply: blockedReply(), blocked: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let externalData = "";
/* =========================
   🧠 INTENT DETECTION
========================= */
let q = message.toLowerCase();

let intent = "general";

if (q.includes("price") || q.includes("btc") || q.includes("tsla") || q.includes("stock")) {
  intent = "finance";
}
else if (q.includes("predict") || q.includes("future")) {
  intent = "prediction";
}
else if (q.includes("news") || q.includes("war")) {
  intent = "news";
}
else if (q.includes("time") || q === "ist") {
  intent = "time";
}
else if (q.includes("pm") || q.includes("president")) {
  intent = "fact";
}
    /* =========================
       🔵 EVALUATE MODE (SERPER CLEAN + ANALYSIS)
    ========================== */
    if (mode === "evaluate" && env.SERPER) {
      try {
        let q = message.toLowerCase();
        let smartQuery = message;

        // 🔥 SMART QUERY ROUTING
        if (q.includes("btc") || q.includes("bitcoin")) {
          smartQuery = "Bitcoin price today USD live";
        }
        else if (q.includes("tsla")) {
          smartQuery = "Tesla stock price today USD";
        }
        else if (q.includes("eth")) {
          smartQuery = "Ethereum price today USD";
        }
        else if (q.includes("india pm")) {
          smartQuery = "current prime minister of India";
        }
        else if (q.includes("us president")) {
          smartQuery = "current US president";
        }

        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": env.SERPER,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ q: smartQuery })
        });

        const data = await res.json();

        let texts = [];

        if (data.answerBox?.answer) texts.push(data.answerBox.answer);
        if (data.answerBox?.snippet) texts.push(data.answerBox.snippet);

        if (data.organic) {
          for (let r of data.organic.slice(0, 5)) {
            let t = r.snippet || "";

            // ❌ remove junk numbers (IDs etc)
            t = t.replace(/\b\d{6,}\b/g, "");

            texts.push(t);
          }
        }

        externalData = texts.join("\n");

        if (!externalData) {
          externalData = "No clear data found.";
        }

      } catch {
        externalData = "Search failed.";
      }
    }

    /* =========================
       🧠 SYSTEM PROMPTS
    ========================== */
    let systemPrompt = buildSystemPrompt(mode);

    /* =========================
       🧾 FINAL USER MESSAGE
    ========================== */
    let finalUserMessage = message;

    if (mode === "evaluate") {
      finalUserMessage = `
DATA:
${externalData}

QUESTION:
${message}

INSTRUCTION:
- Analyze the data
- Do NOT list raw numbers
- Give final answer only
`;
    }

    /* =========================
       🤖 GROQ CALL
    ========================== */
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserMessage }
        ]
      })
    });

    const aiData = await aiRes.json();

    let reply = aiData?.choices?.[0]?.message?.content || "No reply";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
