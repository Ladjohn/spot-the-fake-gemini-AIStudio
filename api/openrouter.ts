// api/openrouter.ts — Vercel Serverless proxy for OpenRouter
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
  if (!OPENROUTER_KEY) return res.status(500).json({ error: 'Missing server OPENROUTER_API_KEY' })

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify(req.body),
    })

    const body = await response.text()
    // Forward status + body so client receives the same structure (helpful for debugging)
    res.status(response.status).send(body)
  } catch (err) {
    console.error('OpenRouter proxy error', err)
    res.status(500).json({ error: String(err) })
  }
}
