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

    // Step 1: Check if API key is present
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // Step 2: Try fetching from Groq Cloud
    const query = `*[_type=="messages" && text match "${message}"]{text}`;

    try {
      const data = await client.fetch(query);

      // Step 3: Check if data is empty
      if (!data || data.length === 0) {
        return res.status(200).json({ success: true, warning: 'Query succeeded but returned no results. Check your dataset and _type.' });
      }

      res.status(200).json({ success: true, data });

    } catch (groqError) {
      // Catch Groq-specific errors and display them
      console.error('Groq API error:', groqError);
      res.status(500).json({
        error: 'GROQ API request failed.',
        message: groqError.message,
        stack: groqError.stack,
      });
    }

  } catch (err) {
    console.error('chat.js error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
