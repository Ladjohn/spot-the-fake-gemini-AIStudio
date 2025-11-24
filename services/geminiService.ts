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
  const systemPrompt = `You will return ONLY a JSON array of items.`

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
    }
  }

  // fallback single stub item
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
    // swallow
  }
}

export async function analyzeAuthenticity(item: NewsItem): Promise<VerificationResult> {
  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'user', content: `Analyze this news item and return ONLY JSON: { "authenticityScore": number, "verdict": "REAL"|"FAKE"|"UNCERTAIN", "reasoning": "..." } Headline: ${item.headline} Summary: ${item.summary ?? ''}` }
    ],
    max_tokens: 500
  }

  const raw = await askLLM(payload)
  // try parse similarly to generateQuizRound
  let candidate: any = null
  if (typeof raw === 'object' && raw.choices) {
    candidate = raw.choices?.[0]?.message?.content ?? null
  } else if (typeof raw === 'string') {
    candidate = raw
  }

  try {
    const parsed = typeof candidate === 'string' ? JSON.parse(candidate) : candidate
    return {
      authenticityScore: Number(parsed?.authenticityScore ?? 50),
      verdict: (parsed?.verdict ?? 'UNCERTAIN') as 'REAL' | 'FAKE' | 'UNCERTAIN',
      reasoning: parsed?.reasoning ?? String(parsed),
      sources: parsed?.sources ?? [],
      usedSearch: !!parsed?.usedSearch,
      visualArtifacts: parsed?.visualArtifacts ?? []
    }
  } catch (e) {
    return {
      authenticityScore: 50,
      verdict: 'UNCERTAIN',
      reasoning: typeof candidate === 'string' ? candidate : JSON.stringify(candidate).slice(0, 200),
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    }
  }
}

export function speakHeadline(text: string) {
  return text
}
