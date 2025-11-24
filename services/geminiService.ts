import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NewsItem, VerificationResult } from '../types';

const apiKey = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey });

// Cache for pre-loading
let cachedRounds: Record<string, NewsItem[]> = {};
let fetchingPromise: Record<string, Promise<NewsItem[]> | null> = {};

const cleanJsonString = (str: string) => {
  let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstOpen = cleaned.indexOf('[');
  const firstObjOpen = cleaned.indexOf('{');
  
  if (firstOpen !== -1 && (firstObjOpen === -1 || firstOpen < firstObjOpen)) {
      const lastClose = cleaned.lastIndexOf(']');
      if (lastClose !== -1) {
          cleaned = cleaned.substring(firstOpen, lastClose + 1);
      }
  } else if (firstObjOpen !== -1) {
      const lastClose = cleaned.lastIndexOf('}');
      if (lastClose !== -1) {
          cleaned = cleaned.substring(firstObjOpen, lastClose + 1);
      }
  }
  return cleaned;
};

// Retry helper for transient 500 errors
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes('500') || error.status === 500 || error.code === 500)) {
      console.warn(`API Error 500. Retrying... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Preload images into browser cache
const preloadImages = (items: NewsItem[]) => {
  if (typeof window === 'undefined') return;
  items.forEach(item => {
    const img = new Image();
    img.src = item.imageUrl;
  });
};

/**
 * Generates a fallback image using Gemini 2.5 Flash Image (Nano Banana)
 */
export const generateAiImage = async (prompt: string): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = getAiClient();
  
  try {
    console.log("Generating fallback image for:", prompt);
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A photorealistic news photo of: ${prompt}` }]
      },
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

/**
 * Generates a set of news items.
 */
export const generateQuizRound = async (count: number = 10, difficulty: string = 'Medium'): Promise<NewsItem[]> => {
  if (cachedRounds[difficulty] && cachedRounds[difficulty].length > 0) {
    const items = cachedRounds[difficulty];
    cachedRounds[difficulty] = [];
    preloadRound(difficulty, count); 
    return items;
  }

  if (fetchingPromise[difficulty]) {
    return await fetchingPromise[difficulty] as NewsItem[];
  }

  return await fetchNewRound(count, difficulty);
};

export const preloadRound = (difficulty: string, count: number = 10) => {
  if (!fetchingPromise[difficulty] && (!cachedRounds[difficulty] || cachedRounds[difficulty].length === 0)) {
    console.log(`Pre-loading ${count} ${difficulty} questions...`);
    fetchingPromise[difficulty] = fetchNewRound(count, difficulty).then(items => {
      cachedRounds[difficulty] = items;
      fetchingPromise[difficulty] = null;
      return items;
    });
  }
};

const fetchNewRound = async (count: number, difficulty: string): Promise<NewsItem[]> => {
  if (!apiKey) return getFallbackData();
  const ai = getAiClient();

  const prompt = `
    Find ${count} recent viral news stories suitable for a "Spot the Fake" game.
    Difficulty Level: ${difficulty}.
    
    Search the web for real recent odd news and common urban legends/fakes.
    
    Mix: 'REAL' (True but surprising/odd) and 'FAKE' (False but viral/plausible).
    
    Instructions:
    1. For REAL stories, verify they are factually accurate using Google Search.
    2. For FAKE stories, use popular debunked myths or construct plausible satire.
    3. Provide a very short "imagePrompt" (max 3-5 words) describing the scene.
    
    Return a STRICT JSON ARRAY. Do not include markdown code blocks.
    Structure:
    [
      {
        "id": "unique_id",
        "headline": "Catchy Headline",
        "summary": "1 sentence summary",
        "type": "REAL" or "FAKE",
        "category": "Politics" | "Tech" | "Science" | "Culture" | "Health",
        "difficulty": "${difficulty}",
        "explanation": "Why it is Real/Fake",
        "imagePrompt": "Visual description"
      }
    ]
  `;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }]
      }
    }));

    const rawText = cleanJsonString(response.text || '[]');
    console.log("Raw JSON response:", rawText); 
    
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return getFallbackData();
    }
    
    if (!Array.isArray(data)) return getFallbackData();

    const items = data.map((item: any) => {
        let rawPrompt = item.imagePrompt || item.headline || "news";
        // Keep prompt extremely simple for Pollinations
        rawPrompt = rawPrompt.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const words = rawPrompt.split(' ').slice(0, 4).join(' ');
        const safePrompt = encodeURIComponent(`${words}`);
        const seed = Math.floor(Math.random() * 99999);
        
        const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&nologo=true&seed=${seed}&model=flux`;

        return {
          ...item,
          type: item.type.toUpperCase(), 
          imageUrl: imageUrl, 
        };
    });

    // Start preloading images immediately
    preloadImages(items);

    return items;

  } catch (error) {
    console.error("Failed to generate rounds:", error);
    return getFallbackData();
  }
};

export const analyzeAuthenticity = async (headline: string, summary: string): Promise<VerificationResult> => {
  if (!apiKey) throw new Error("API Key missing");
  const ai = getAiClient();

  const systemPrompt = `
    Verify this story:
    "${headline}" - ${summary}
    Return a valid JSON object with: authenticityScore (0-1), verdict, reasoning, visualArtifacts.
  `;

  try {
    // Attempt 1: High quality analysis with Search Grounding
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt} \n Perform Google Search to check facts.`,
      config: {
        tools: [{ googleSearch: {} }], 
      }
    }));

    return parseAnalysisResponse(response);

  } catch (error) {
    console.warn("Search analysis failed (500), falling back to internal knowledge:", error);
    
    try {
      // Attempt 2: Fallback to internal knowledge (No Tools) to avoid 500 error
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemPrompt} \n Analyze based on internal knowledge.`,
      }));
      
      return parseAnalysisResponse(response);
    } catch (fallbackError) {
      console.error("Fallback analysis failed:", fallbackError);
      return {
        authenticityScore: 0.5,
        verdict: 'Unverifiable',
        reasoning: 'System currently offline. Please verify independently.',
        visualArtifacts: [],
        sources: []
      };
    }
  }
};

const parseAnalysisResponse = (response: any): VerificationResult => {
    let text = cleanJsonString(response.text || '{}');
    let result;
    try { 
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
          text = text.substring(start, end + 1);
      }
      result = JSON.parse(text); 
    } catch { 
      result = {}; 
    }

    let sources: { title: string; uri: string }[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      sources = groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => ({
          title: chunk.web.title || 'Source',
          uri: chunk.web.uri
        }));
    }

    return {
      authenticityScore: typeof result.authenticityScore === 'number' ? result.authenticityScore : 0.5,
      verdict: result.verdict || 'Unverifiable',
      reasoning: result.reasoning || 'Analysis unavailable.',
      visualArtifacts: result.visualArtifacts || [],
      sources: sources
    };
}

const getFallbackData = () => [
  {
    id: 'fallback-1',
    headline: 'Scientists Communicate with Whales using AI',
    summary: 'A team in Alaska successfully identified and replied to a humpback whale greeting call.',
    type: 'REAL',
    category: 'Science',
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?auto=format&fit=crop&w=600&q=80',
    explanation: 'This actually happened in 2023 during a SETI-related experiment.',
    imagePrompt: 'Whale breaching water'
  },
  {
    id: 'fallback-2',
    headline: 'Eiffel Tower to be Painted Neon Pink',
    summary: 'Reports claim Paris officials approved a coating for visibility.',
    type: 'FAKE',
    category: 'Culture',
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&w=600&q=80',
    explanation: 'Hoax. It is painted "Eiffel Tower Brown".',
    imagePrompt: 'Pink Eiffel Tower'
  },
  {
    id: 'fallback-3',
    headline: 'Mars Rover Finds Ancient Doorway',
    summary: 'NASA curiosity rover images show what appears to be a carved entrance.',
    type: 'FAKE',
    category: 'Science',
    difficulty: 'Easy',
    imageUrl: 'https://image.pollinations.ai/prompt/mars%20doorway?width=800&height=600&nologo=true',
    explanation: 'Pareidolia. It is just a fracture in the rock formation.',
    imagePrompt: 'Mars rock door'
  }
] as NewsItem[];