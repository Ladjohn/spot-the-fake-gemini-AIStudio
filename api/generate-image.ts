// api/generate-image.ts
const FETCH_TIMEOUT_MS = 30000;
const MAX_PROMPT_LENGTH = 1000;


function timeoutPromise(ms: number) {
return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
if (!HUGGINGFACE_KEY) return res.status(500).json({ error: 'Missing HUGGINGFACE_API_KEY' });


const { prompt, model = 'stabilityai/stable-diffusion-xl-1024-v1-0', width = 768, height = 512 } = req.body || {};
if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') return res.status(400).json({ error: 'Missing prompt' });
if (prompt.length > MAX_PROMPT_LENGTH) return res.status(400).json({ error: 'Prompt too long' });


try {
const hfUrl = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;


// HF image endpoints typically return binary image if Accept isn't application/json.
// We'll POST JSON and request image/jpeg response.
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);


const upstream = await Promise.race([
fetch(hfUrl, {
method: 'POST',
headers: {
Authorization: `Bearer ${HUGGINGFACE_KEY}`,
'Content-Type': 'application/json',
Accept: 'image/jpeg',
},
body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
signal: controller.signal,
}),
timeoutPromise(FETCH_TIMEOUT_MS),
]) as Response;


clearTimeout(timeout as any);


if (!upstream.ok) {
// Try to read text error body
const txt = await upstream.text().catch(() => '');
return res.status(upstream.status).json({ error: 'Upstream error', details: txt.slice(0, 1000) });
}


const arrayBuffer = await upstream.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const b64 = buffer.toString('base64');
const mime = 'image/jpeg';
const dataUri = `data:${mime};base64,${b64}`;


// Return JSON with data URI
res.setHeader('Content-Type', 'application/json');
return res.status(200).json({ ok: true, dataUri });
} catch (err: any) {
console.error('generate-image error', err && (err.stack || err.message || err));
if (err.name === 'AbortError') return res.status(504).json({ error: 'Upstream timed out' });
return res.status(500).json({ error: 'Image generation failed', details: String(err && (err.message || err)) });
}
}
