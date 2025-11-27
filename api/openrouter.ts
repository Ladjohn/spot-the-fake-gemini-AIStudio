// api/openrouter.ts — multi-provider proxy (OpenRouter + Hugging Face)
// Keep server keys in Vercel env: OPENROUTER_API_KEY, HUGGINGFACE_API_KEY
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_REQUEST_BODY_BYTES = 64 * 1024; // 64KB
const FETCH_TIMEOUT_MS = 12000; // 12s

// Allowed model prefixes — empty array = no whitelist blocking
// To allow everything temporarily set to [].
const ALLOWED_MODEL_PREFIXES = [
  'deepseek/', // OpenRouter family
  'hf/',       // Hugging Face inference (prefix style: hf/<model-id>)
];

// Helper to timeout fetch
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[llm-proxy] invoked', { method: req.method, url: req.url });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check server envs
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
  const HUGGINGFACE_KEY = process.env.HUGGINGFACE_API_KEY || '';

  console.log('[llm-proxy] envs present', {
    OPENROUTER: !!OPENROUTER_KEY,
    HUGGINGFACE: !!HUGGINGFACE_KEY,
  });

  try {
    const rawBody = req.body;
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
    if (Buffer.byteLength(bodyStr, 'utf8') > MAX_REQUEST_BODY_BYTES) {
      return res.status(413).json({ error: 'Payload too large' });
    }

    // parse JSON body when possible
    let payload: any = rawBody;
    if (typeof rawBody === 'string') {
      try { payload = JSON.parse(rawBody); } catch { payload = rawBody; }
    }

    // read model field (defensive)
    const model: string | undefined = payload && typeof payload === 'object' ? payload.model : undefined;
    console.log('[llm-proxy] requested model:', model);

    // Enforce prefix whitelist if set
    if (ALLOWED_MODEL_PREFIXES.length > 0 && model) {
      const allowed = ALLOWED_MODEL_PREFIXES.some((p) => model.startsWith(p));
      if (!allowed) {
        console.warn('[llm-proxy] model not allowed by prefix whitelist:', model);
        return res.status(400).json({ error: 'Model not allowed by proxy', model });
      }
    }

    // Route based on model prefix
    if (!model) {
      return res.status(400).json({ error: 'Missing model field in payload' });
    }

    // ---------- OpenRouter (deepseek/*)
    if (model.startsWith('deepseek/')) {
      if (!OPENROUTER_KEY) {
        console.error('[llm-proxy] missing OPENROUTER_API_KEY for OpenRouter request');
        return res.status(500).json({ error: 'Missing server OPENROUTER_API_KEY' });
      }

      // Forward payload directly to OpenRouter endpoint
      const upstreamUrl = 'https://openrouter.ai/api/v1/chat/completions';
      try {
        const upstreamRes = await fetchWithTimeout(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENROUTER_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        const text = await upstreamRes.text();
        const ct = upstreamRes.headers.get('content-type') || 'application/json';
        res.setHeader('Content-Type', ct);
        res.status(upstreamRes.status).send(text);
        console.log('[llm-proxy] forwarded to OpenRouter status', upstreamRes.status);
        return;
      } catch (err: any) {
        console.error('[llm-proxy] OpenRouter forward error', err && (err.message || err));
        if (err.name === 'AbortError') return res.status(504).json({ error: 'Upstream timed out' });
        return res.status(502).json({ error: 'OpenRouter proxy error', details: String(err && (err.message || err)) });
      }
    }

    // ---------- Hugging Face Inference (hf/<modelId>)
    // Example model field: "hf/facebook/opt-1.3b" or "hf/bigscience/bloom"
    if (model.startsWith('hf/')) {
      if (!HUGGINGFACE_KEY) {
        console.error('[llm-proxy] missing HUGGINGFACE_API_KEY for HF request');
        return res.status(500).json({ error: 'Missing server HUGGINGFACE_API_KEY' });
      }

      // Extract actual HF model id (strip hf/)
      const hfModel = model.slice(3);
      if (!hfModel) return res.status(400).json({ error: 'Invalid HuggingFace model id' });

      // Build HF inference URL
      const hfUrl = `https://api-inference.huggingface.co/models/${encodeURIComponent(hfModel)}`;

      // For HF we will send the `inputs` or the raw payload depending on user's shape.
      // If the payload looks like OpenAI chat format, convert it to a single input string.
      let hfBody: any;
      if (Array.isArray(payload?.messages)) {
        // convert chat messages into a single prompt
        const messages = payload.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
        hfBody = { inputs: messages, parameters: { max_new_tokens: payload.max_tokens ?? 300, temperature: payload.temperature ?? 0.7 } };
      } else if (typeof payload?.prompt === 'string') {
        hfBody = { inputs: payload.prompt, parameters: { max_new_tokens: payload.max_tokens ?? 300, temperature: payload.temperature ?? 0.7 } };
      } else {
        // fallback: send raw payload
        hfBody = { inputs: JSON.stringify(payload) };
      }

      try {
        const upstreamRes = await fetchWithTimeout(hfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${HUGGINGFACE_KEY}`,
            Accept: 'application/json',
          },
          body: JSON.stringify(hfBody),
        });
        const text = await upstreamRes.text();
        const ct = upstreamRes.headers.get('content-type') || 'application/json';
        res.setHeader('Content-Type', ct);
        res.status(upstreamRes.status).send(text);
        console.log('[llm-proxy] forwarded to HuggingFace status', upstreamRes.status, 'preview:', text.slice(0,400));
        return;
      } catch (err: any) {
        console.error('[llm-proxy] HuggingFace forward error', err && (err.message || err));
        if (err.name === 'AbortError') return res.status(504).json({ error: 'Upstream timed out' });
        return res.status(502).json({ error: 'HuggingFace proxy error', details: String(err && (err.message || err)) });
      }
    }

    // Unknown model prefix
    return res.status(400).json({ error: 'Unsupported model prefix', model });
  } catch (err: any) {
    console.error('[llm-proxy] handler error', err && (err.stack || err.message || err));
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Upstream timed out' });
    return res.status(500).json({ error: 'Proxy internal error', details: String(err && (err.message || err)) });
  }
}
