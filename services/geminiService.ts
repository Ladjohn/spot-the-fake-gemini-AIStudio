// src/services/geminiService.ts — client code that calls our serverless proxy
import { NewsItem, VerificationResult, Difficulty } from '../types'

const ENDPOINT = '/api/openrouter' // local relative path to our serverless proxy
const DEFAULT_MODEL = 'deepseek/deepseek-chat' // free+fast

// helper: fetch with timeout
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

// safe parse for arrays (tries to extract JSON when LLM adds surrounding text)
function safeParseArray(raw: string): any[] | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch (e) {
    // try to extract first JSON array substring
    const first = raw.indexOf('[')
    const last = raw.lastIndexOf(']')
    if (first !== -1 && last !== -1 && last > first) {
      try {
        const chunk = raw.slice(first, last + 1)
        const parsed2 = JSON.parse(chunk)
        if (Array.isArray(parsed2)) return parsed2
      } catch {}
    }
  }
  return null
}

// askLLM -> calls serverless proxy which uses the secret key
async function askLLM(payload: any) {
  const res = await fetchWithTimeout(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 12000)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Proxy error ${res.status}: ${text}`)
  }
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    // proxy returned plain text (likely the OpenRouter JSON string) — return raw text
    return text
  }
}

export async function generateQuizRound(difficulty: Difficulty, count = 1): Promise<NewsItem[]> {
  const systemPrompt = `You will return ONLY a JSON array of items. No commentary, no extra text.`
  const userPrompt = `Create ${count} news items in strict JSON array format. Each item must have: headline, summary, type ("REAL" or "FAKE"). Difficulty: ${difficulty}. Return ONLY the JSON array.`

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    max_tokens: 700
  }

  const raw = await askLLM(payload)
  console.log('LLM raw response (generateQuizRound):', raw)

  // If askLLM returned an object (parsed JSON) from proxy -> try choices path first
  if (typeof raw === 'object' && raw.choices) {
    const text = raw.choices?.[0]?.message?.content ?? ''
    const parsed = safeParseArray(text)
    if (parsed) {
      return parsed.map((it: any, i: number) => ({
        id: it.id ?? `${difficulty}-${Date.now()}-${i}`,
        headline: it.headline ?? it.title ?? String(it),
        summary: it.summary ?? '',
        type: (it.type ?? 'REAL') as 'REAL' | 'FAKE',
        category: it.category ?? 'General',
        difficulty,
        explanation: it.explanation ?? '',
        imagePrompt: it.imagePrompt ?? '',
        imageUrl: it.imageUrl ?? ''
      }))
    } else {
      console.error('Could not parse choices.content as array:', text)
    }
  }

  // If the proxy returned plain text (string)
  if (typeof raw === 'string') {
    const parsed = safeParseArray(raw)
    if (parsed) {
      return parsed.map((it: any, i: number) => ({
        id: it.id ?? `${difficulty}-${Date.now()}-${i}`,
        headline: it.headline ?? it.title ?? String(it),
        summary: it.summary ?? '',
        type: (it.type ?? 'REAL') as 'REAL' | 'FAKE',
        category: it.category ?? 'General',
        difficulty,
        explanation: it.explanation ?? '',
        imagePrompt: it.imagePrompt ?? '',
        imageUrl: it.imageUrl ?? ''
      }))
    } else {
      console.error('Could not parse raw string response into array:', raw)
    }
  }

  // fallback single stub item (safe, prevents blank UI)
  return [
    {
      id: `fallback-${difficulty}`,
      headline: 'Could not parse OpenRouter response',
      summary: typeof raw === 'string' ? raw.slice(0, 200) : JSON.stringify(raw).slice(0, 200),
      type: 'REAL',
      category: 'General',
      difficulty,
      explanation: '',
      imagePrompt: '',
      imageUrl: ''
    }
  ]
}

// small cache + preload function expected by App.tsx
let _preloadCache: Record<string, NewsItem[]> = {}
export async function preloadRound(difficulty: Difficulty, count = 1): Promise<void> {
  const key = `${difficulty}:${count}`
  if (_preloadCache[key]) return
  try {
    const items = await generateQuizRound(difficulty, count)
    _preloadCache[key] = items
  } catch (e) {
    console.warn('preloadRound failed', e)
  }
}

// src/services/geminiService.ts — patch analyzeAuthenticity
export async function analyzeAuthenticity(item: NewsItem): Promise<VerificationResult> {
  // Defensive guard: if item lacks core fields, return a safe UNCERTAIN object
  if (!item?.headline || !item?.summary) {
    return {
      authenticityScore: 0,             // numeric 0..100
      verdict: 'UNCERTAIN',
      reasoning: 'The headline or summary is missing, so authenticity cannot be determined.',
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    };
  }

  // existing LLM call (your implementation)...
  try {
    const raw = await askLLM({ /* your payload */ });
    // try to extract a JSON object in a few ways
    let candidateText = '';
    if (typeof raw === 'string') candidateText = raw;
    else if (typeof raw === 'object' && raw.choices) {
      candidateText = raw.choices?.[0]?.message?.content ?? '';
    } else {
      candidateText = JSON.stringify(raw);
    }

    // try parse
    let parsed = null;
    try { parsed = JSON.parse(candidateText); } catch(e) {
      // try to extract a JSON substring
      const a = candidateText.indexOf('{'), b = candidateText.lastIndexOf('}');
      if (a !== -1 && b !== -1 && b > a) {
        try { parsed = JSON.parse(candidateText.slice(a, b+1)); } catch {}
      }
    }

    if (!parsed) {
      console.warn('analyzeAuthenticity: could not parse response; returning UNCERTAIN', candidateText);
      return {
        authenticityScore: 50,
        verdict: 'UNCERTAIN',
        reasoning: typeof candidateText === 'string' ? candidateText.slice(0, 300) : 'No parseable response',
        sources: [],
        usedSearch: false,
        visualArtifacts: []
      }
    }

    // normalize score to 0..100
    let rawScore = Number(parsed.authenticityScore ?? parsed.score ?? 50);
    if (!isFinite(rawScore)) rawScore = 50;
    // if model returned 0..1 convert (very defensive)
    if (rawScore <= 1) rawScore = Math.round(rawScore * 100);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      authenticityScore: score,
      verdict: (parsed.verdict ?? parsed.verdict_text ?? 'UNCERTAIN').toString().toUpperCase() as 'REAL'|'FAKE'|'UNCERTAIN',
      reasoning: parsed.reasoning ?? parsed.explanation ?? String(parsed).slice(0, 400),
      sources: parsed.sources ?? [],
      usedSearch: !!parsed.usedSearch,
      visualArtifacts: parsed.visualArtifacts ?? []
    };
  } catch (err) {
    console.error('analyzeAuthenticity error', err);
    return {
      authenticityScore: 50,
      verdict: 'UNCERTAIN',
      reasoning: 'Verification failed — service error.',
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    }
  }
}

export function speakHeadline(text: string) {
  return text
}
