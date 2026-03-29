export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
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

RULES:
- Always leave space between Final Answer , Key Facts etc. in order to maintain the gap , sequence and diffrence 
- Always respond in this format:

FINAL ANSWER:
...

KEY FACTS:
- ...
- ...(*MINIMUM 5 KEY FACTS IN TABLE ORDER NOT IN THE FORM OF LINES")

CONFIDENCE:
High / Medium / Low (*Also write confidence percentage in an super detailed way like: 97.3265256256245 % , based on true way no fake*)

ASSUMPTIONS:
...
Halucination Probability : 
(*WRITE AN EXACT PERCENTAGE OF YOUR HALUCINATION POSSIBILITY LIKE : 99.4351541544% , WRITE DOWN WHERE DID YOU HALLUCINATED*)

Rules:
- No fluff
- Long paragraphs
- No tool mention
- Be direct, sharp, logical
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
