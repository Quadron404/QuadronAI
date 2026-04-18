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

    // Simple SVG representation of the share image
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="100%" height="100%" fill="black"/>
    <text x="50" y="200" fill="gold" font-size="40" font-family="Arial">User: ${user}</text>
    <text x="50" y="350" fill="white" font-size="40" font-family="Arial">AI: ${ai}</text>
    </svg>`;

    return new Response(svg, { 
      headers: { "Content-Type": "image/svg+xml" } 
    });
  }
  try {
    const { message, mode } = await request.json();

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
    let systemPrompt = "";

    if (mode === "evaluate") {
      systemPrompt = `
You are Quadron AI (Truth Engine Mode).

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
`;
    }

    else if (mode === "code") {
      systemPrompt = `
Only output code. No explanation.
`;
    }

    else {
      systemPrompt = `
You are Quadron AI. Be sharp and slightly sarcastic.
`;
    }

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
        temperature: 0.2,
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
