// functions/api/chat.js

import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: GROQ_API_KEY missing.' });
    }

    // Example query – adjust according to your actual Groq setup
    const query = encodeURIComponent(`*[_type == "messages" && text match "${message}"]{text}`);
    const url = `https://groqapi.example.com/v1/data/query?query=${query}`;

    const response = await fetch(url, {
      method: 'GET', // or 'POST' if your API needs it
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'GROQ API request failed', details: errorText });
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('chat.js error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
