// functions/api/chat.js
import { GroqClient } from 'groq-cloud-sdk';

// Initialize Groq client with API key
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  try {
    // GET requests show friendly message in browser
    if (req.method === 'GET') {
      return res
        .status(200)
        .send("Quadron AI POST endpoint. Send JSON with { message: '...' } to get a sarcastic reply.");
    }

    // Only allow POST for AI messages
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST requests only' });
    }

    // Read message from request
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // System prompt ensures sarcastic personality
    const systemPrompt = "You are Quadron, a sarcastic AI.";

    // Call Groq API for inference
    const data = await client.inference({
      model: 'gpt-oss-120b',
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });

    // Return AI response
    const reply = data.output ? data.output.join("\n") : "Quadron couldn't respond.";

    return res.status(200).json({ success: true, data: [{ text: reply }] });

  } catch (err) {
    console.error('GROQ AI error:', err);
    return res.status(500).json({
      error: 'GROQ API request failed',
      message: err.message
    });
  }
}
