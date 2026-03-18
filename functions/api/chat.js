// functions/api/chat.js
import { GroqClient } from 'groq-cloud-sdk';

// Initialize Groq client with your API key from environment variables
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST requests only.' });
    }

    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Ensure API key is set
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // GROQ query – adjust _type if needed to match your dataset
    const query = `*[_type=="messages" && text match "${message}"]{text}`;

    try {
      const data = await client.fetch(query);

      // If no documents found, return friendly warning
      if (!data || data.length === 0) {
        return res.status(200).json({
          success: true,
          warning: 'No matching messages found in Groq dataset.',
          data: [{ text: `I couldn't find anything for "${message}" in the dataset.` }],
        });
      }

      // Return messages found
      return res.status(200).json({ success: true, data });

    } catch (groqError) {
      // Catch Groq-specific errors
      console.error('Groq API error:', groqError);
      return res.status(500).json({
        error: 'GROQ API request failed',
        message: groqError.message || 'Unknown Groq error',
      });
    }

  } catch (err) {
    // Catch any other errors
    console.error('chat.js error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
