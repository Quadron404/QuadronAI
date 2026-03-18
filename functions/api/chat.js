// functions/api/chat.js
import { GroqClient } from 'groq-cloud-sdk';

const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY, // must be set in Cloudflare env
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST requests only.' });
    }

    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // System prompt + user message
    const systemPrompt = "You are Quadron, a sarcastic AI.";
    const userPrompt = message;

    // Call GPT-OSS-120B (or whichever GPT model your Groq API supports)
    const data = await client.inference({
      model: 'gpt-oss-120b',
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    // The AI model may return data.output as array of text strings
    const reply = data.output ? data.output.join("\n") : "Quadron couldn't respond";

    return res.status(200).json({
      success: true,
      data: [{ text: reply }]
    });

  } catch(err) {
    console.error('GROQ AI error:', err);
    return res.status(500).json({
      error: 'GROQ API request failed',
      message: err.message
    });
  }
}
