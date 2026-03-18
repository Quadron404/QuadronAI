// functions/api/chat.js
import { GroqClient } from 'groq-cloud-sdk';

const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requests only.' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    // Fetch messages from your Groq dataset
    const query = `*[_type=="messages" && text match "${message}"]{text}`;
    const data = await client.fetch(query);

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('chat.js error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
