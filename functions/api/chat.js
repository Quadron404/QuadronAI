// functions/api/chat.js
import { GroqClient } from 'groq-cloud-sdk';

// Initialize Groq client with your API key
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requests only.' });
  }

  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Check that API key is set
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // GROQ query (update _type if your dataset uses a different type)
    const query = `*[_type=="messages" && text match "${message}"]{text}`;

    try {
      const data = await client.fetch(query);

      // If query returned nothing
      if (!data || data.length === 0) {
        return res.status(200).json({
          success: true,
          warning: 'Query succeeded but returned no results. Check dataset and _type in Groq Cloud.',
        });
      }

      // Success: return messages
      return res.status(200).json({
        success: true,
        data, // Array of { text }
      });

    } catch (groqError) {
      // Detailed Groq API error
      console.error('Groq API error:', groqError);
      return res.status(500).json({
        error: 'GROQ API request failed',
        message: groqError.message,
      });
    }

  } catch (err) {
    // Catch any other server errors
    console.error('chat.js error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
}
