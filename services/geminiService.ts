// src/services/geminiService.ts — OpenRouter FREE version
import { NewsItem, VerificationResult, Difficulty } from '../types'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
const REFERER = "https://spot-the-fake.vercel.app"  // <-- CHANGE to your deployed URL

async function askLLM(prompt: string) {
  if (!API_KEY) {
    throw new Error("Missing VITE_OPENROUTER_API_KEY")
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": REFERER,
      "X-Title": "Spot The Fake (OpenRouter)"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",  // FREE + FAST model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 700
    })
  })

  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? ""
}

export async function generateQuizRound(difficulty: Difficulty, count = 1): Promise<NewsItem[]> {
  const prompt = `
Create ${count} news items in STRICT JSON array format.
Each item must have: headline, summary, type ("REAL" or "FAKE").
Difficulty: ${difficulty}.
Return ONLY the JSON array.
`

  const raw = await askLLM(prompt)

  try {
    const parsed = JSON.parse(raw)
    return parsed.map((item: any, i: number) => ({
      id: `${difficulty}-${Date.now()}-${i}`,
      headline: item.headline,
      summary: item.summary,
      type: item.type,
      category: "General",
      difficulty,
      explanation: "",
      imagePrompt: "",
      imageUrl: ""
    }))
  } catch (e) {
    console.error("JSON parse failed:", raw)

    return [
      {
        id: `fallback-${difficulty}`,
        headline: "Could not parse OpenRouter response",
        summary: raw.slice(0, 200),
        type: "REAL",
        category: "General",
        difficulty,
        explanation: "",
        imagePrompt: "",
        imageUrl: ""
      }
    ]
  }
}

export async function analyzeAuthenticity(item: NewsItem): Promise<VerificationResult> {
  const prompt = `
Analyze this news item and respond ONLY with JSON:
{
  "authenticityScore": number,
  "verdict": "REAL" | "FAKE" | "UNCERTAIN",
  "reasoning": "..."
}
Headline: ${item.headline}
Summary: ${item.summary}
`

  const raw = await askLLM(prompt)

  try {
    const parsed = JSON.parse(raw)
    return {
      authenticityScore: parsed.authenticityScore ?? 50,
      verdict: parsed.verdict ?? "UNCERTAIN",
      reasoning: parsed.reasoning ?? "",
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    }
  } catch {
    return {
      authenticityScore: 50,
      verdict: "UNCERTAIN",
      reasoning: raw,
      sources: [],
      usedSearch: false,
      visualArtifacts: []
    }
  }
}

export function speakHeadline(text: string) {
  return text
}
