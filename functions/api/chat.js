export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Only POST allowed", { status: 405 });
  }

  try {
    const { message, evaluate } = await request.json();

    let tavilyContent = "";

    /* 🔎 FETCH REAL-TIME DATA */
    if (evaluate) {
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
      tavilyContent = tavilyData.results.map(r => r.content).join("\n");
    }

    /* 🧠 FIRST AI CALL (TEXT) */
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
            content: "You are Quadron AI. Be smart and slightly sarcastic."
          },
          {
            role: "user",
            content: evaluate
              ? `Use ONLY this real-time data:\n${tavilyContent}\nAnswer clearly.`
              : message
          }
        ]
      })
    });

    const textData = await textRes.json();
    const reply = textData.choices?.[0]?.message?.content || "No reply";

    let graphCode = null;

    /* 📊 SECOND AI CALL (GRAPH CODE ONLY) */
    if (evaluate) {
      const graphRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              content: "Return ONLY JavaScript Chart.js code. No text."
            },
            {
              role: "user",
              content: `Create a chart using this data , graph should be according to data don't provide fake graph:\n${tavilyContent}`
            }
          ]
        })
      });

      const graphData = await graphRes.json();
      graphCode = graphData.choices?.[0]?.message?.content || null;
    }

    return new Response(JSON.stringify({
      reply,
      graph: graphCode
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500 });
  }
}
