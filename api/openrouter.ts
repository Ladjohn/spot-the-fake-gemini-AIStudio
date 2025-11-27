// snippet: HF branch inside your proxy handler (place where you route by model prefix)
if (model.startsWith('hf/')) {
  const HUGGINGFACE_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HUGGINGFACE_KEY) {
    console.error('[llm-proxy] missing HUGGINGFACE_API_KEY');
    return res.status(500).json({ error: 'Missing server HUGGINGFACE_API_KEY' });
  }

  const hfModel = model.slice(3); // strip 'hf/' prefix
  const hfUrl = `https://api-inference.huggingface.co/models/${encodeURIComponent(hfModel)}`;

  // Build HF request body (convert chat messages to single input when necessary)
  let hfBody: any;
  if (Array.isArray(payload?.messages)) {
    const messages = payload.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    hfBody = { inputs: messages, parameters: { max_new_tokens: payload.max_tokens ?? 300, temperature: payload.temperature ?? 0.7 } };
  } else if (typeof payload?.prompt === 'string') {
    hfBody = { inputs: payload.prompt, parameters: { max_new_tokens: payload.max_tokens ?? 300, temperature: payload.temperature ?? 0.7 } };
  } else {
    hfBody = { inputs: JSON.stringify(payload) };
  }

  const upstreamRes = await fetch(hfUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HUGGINGFACE_KEY}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(hfBody),
  });

  const text = await upstreamRes.text();
  res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
  return res.status(upstreamRes.status).send(text);
}
