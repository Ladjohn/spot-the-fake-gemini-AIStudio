// api/openrouter.ts — Vercel Serverless proxy for OpenRouter (improved)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_REQUEST_BODY_BYTES = 64 * 1024; // 64KB
const FETCH_TIMEOUT_MS = 12000; // 12s
const ALLOWED_MODELS = [
  'deepseek/deepseek-chat',
  // add other allowed free/fast models here if you trust them
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'Missing server OPENROUTER_API_KEY' });
  }

  // Basic size guard (if body was sent as text)
  const rawBody = req.body;
  try {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
    if (Buffer.byteLength(bodyStr, 'utf8') > MAX_REQUEST_BODY_BYTES) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    // Try to parse and validate model field (defensive)
    let payload: any = rawBody;
    if (typeof rawBody === 'string') {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // proceed — the upstream might accept plain text; we'll forward it
        payload = rawBody;
      }
    }

    // If payload is an object, do light validation
    if (payload && typeof payload === 'object') {
      // Optional: enforce model whitelist
      if (payload.model && ALLOWED_MODELS.length > 0 && !ALLOWED_MODELS.includes(payload.model)) {
        return res.status(400).json({ error: 'Model not allowed by proxy' });
      }
      // Remove any client-sent Authorization header if present in body (defensive)
      if (payload.api_key) delete payload.api_key;
    }

    // Prepare fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const upstreamRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Read body as text (OpenRouter returns JSON text usually)
    const upstreamText = await upstreamRes.text();

    // Forward status and content-type (if present)
    const ct = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', ct);
    res.status(upstreamRes.status);

    // Limit the length of the forwarded body to avoid extremely large responses
    const MAX_FORWARD_BYTES = 256 * 1024; // 256KB
    const bodyToSend =
      Buffer.byteLength(upstreamText, 'utf8') > MAX_FORWARD_BYTES
        ? upstreamText.slice(0, MAX_FORWARD_BYTES) + '\n...[truncated]'
        : upstreamText;

    return res.send(bodyToSend);
  } catch (err: any) {
    console.error('OpenRouter proxy error', err && (err.stack || err.message || err));
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    return res.status(500).json({ error: 'Proxy internal error' });
  }
}
