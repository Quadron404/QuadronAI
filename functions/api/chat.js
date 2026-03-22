export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, evaluate } = await request.json();

    if (!env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    let tavilyContent = "";

    /* 🔎 FETCH REAL-TIME DATA */
    if (evaluate) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.TAVILY__API,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: message,
            max_results: 3
          })
        });

        const tavilyData = await tavilyRes.json();

        if (!tavilyData?.results || tavilyData.results.length === 0) {
          return new Response(JSON.stringify({
            error: "❌ Tavily Not Working (Check API key)"
          }), { status: 200 });
        }

        tavilyContent = tavilyData.results
          .map(r => r.content)
          .join("\n\n");

      } catch (err) {
        return new Response(JSON.stringify({
          error: "❌ Tavily Fetch Failed"
        }), { status: 200 });
      }
    }

    /* 🧠 TEXT RESPONSE (3 PARAGRAPHS ~150 WORDS EACH) */
    const textRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.GROQ_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
You are Quadron AI.
You are smart, clear, and slightly sarcastic.

RULES:
- If real-time data is provided → ONLY use that
- Write EXACTLY 3 paragraphs
- Each paragraph should be about 150 words
- Maintain logical flow
`
          },
          {
            role: "user",
            content: evaluate
              ? `Use ONLY this real-time data:\n${tavilyContent}`
              : message
          }
        ]
      })
    });

    const textData = await textRes.json();

    if (!textRes.ok) {
      return new Response(JSON.stringify({
        error: "Groq text generation failed",
        details: textData
      }), { status: 500 });
    }

    const reply =
      textData?.choices?.[0]?.message?.content || "No reply";

    let graphs = [];

    /* 📊 GRAPH 1 (ACCURATE DATA CHART) */
    if (evaluate) {
      try {
        const g1 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.GROQ_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `
Return ONLY valid JavaScript using Chart.js.

STRICT RULES:
- Use ONLY real numeric values found in the data
- Do NOT invent or guess numbers
- If insufficient numeric data, use minimal extracted values
- MUST include:
const ctx = document.getElementById("canvas").getContext("2d");
- No explanation, no markdown
`
              },
              {
                role: "user",
                content: `Create an accurate chart from:\n${tavilyContent}`
              }
            ]
          })
        });

        const g1Data = await g1.json();
        graphs.push(g1Data?.choices?.[0]?.message?.content || null);

      } catch {
        graphs.push(null);
      }

      /* 🔥 GRAPH 2 (HEATMAP STYLE) */
      try {
        const g2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.GROQ_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `
Return ONLY JavaScript using Chart.js.

Simulate a heatmap-style visualization.

RULES:
- Use structured numeric data from input
- Use multiple datasets or color intensity
- MUST include:
const ctx = document.getElementById("canvas").getContext("2d");
- No text, no markdown
`
              },
              {
                role: "user",
                content: `Create a detailed heatmap-style chart from:\n${tavilyContent}`
              }
            ]
          })
        });

        const g2Data = await g2.json();
        graphs.push(g2Data?.choices?.[0]?.message?.content || null);

      } catch {
        graphs.push(null);
      }
    }

    return new Response(JSON.stringify({
      reply,
      graphs
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
