const data = await response.json();

console.log(data); // ADD THIS

return new Response(JSON.stringify({
  reply: data.choices?.[0]?.message?.content || JSON.stringify(data)
}), {
  headers: { "Content-Type": "application/json" }
});
