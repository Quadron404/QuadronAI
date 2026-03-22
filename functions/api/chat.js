let graphs = [];

if (evaluate) {

  const prompts = [
    "Create a bar chart",
    "Create a histogram",
    "Create a scatter plot",
    "Create a box plot",
    "Create a stacked bar chart",
    "Create a heatmap"
  ];

  for (let p of prompts) {
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
            content: `
Return ONLY valid JavaScript Chart.js code.

Rules:
- Must use:
const ctx = document.getElementById("canvas").getContext("2d");
- No text, no markdown
`
          },
          {
            role: "user",
            content: `${p} using this data:\n${tavilyContent}`
          }
        ]
      })
    });

    const gData = await graphRes.json();
    graphs.push(gData.choices?.[0]?.message?.content || null);
  }
}
