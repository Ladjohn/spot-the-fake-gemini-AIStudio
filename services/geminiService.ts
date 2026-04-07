import { NewsItem } from '../types';

const ENDPOINT = '/api/openrouter';

let cachedRound: NewsItem[] | null = null;
const recentHeadlines: string[] = [];

const FALLBACK_ITEMS: Array<Omit<NewsItem, 'id'>> = [
  {
    headline: 'Octopuses have three hearts',
    summary: 'Octopuses really do have three hearts: two pump blood to the gills and one pumps it through the body.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'Octopuses have a three-heart circulatory system that supports their oxygen needs underwater.',
    imagePrompt: 'octopus underwater ocean marine biology',
    title: 'Octopuses have three hearts',
  } as any,
  {
    headline: 'Scientists discovered a new deep-sea glowing predator in the Pacific',
    summary: 'Marine researchers do regularly discover new deep-sea species, including bioluminescent predators.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'Deep-sea exploration often reveals previously unknown bioluminescent life forms.',
    imagePrompt: 'deep sea glowing fish ocean research',
    title: 'Scientists discovered a new deep-sea glowing predator in the Pacific',
  } as any,
  {
    headline: 'A city replaced all traffic lights with giant smiley faces',
    summary: 'There is no credible evidence of any city replacing all traffic lights with smiley faces.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'Traffic systems are regulated and safety-critical, making this claim implausible and unsupported.',
    imagePrompt: 'traffic lights city street intersection',
    title: 'A city replaced all traffic lights with giant smiley faces',
  } as any,
  {
    headline: 'NASA tested a new supersonic aircraft designed to reduce sonic booms',
    summary: 'NASA has worked on supersonic aircraft concepts aimed at making sonic booms quieter.',
    type: 'REAL',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Medium',
    explanation: 'NASA has supported low-boom supersonic aviation research for years.',
    imagePrompt: 'supersonic jet nasa aircraft runway',
    title: 'NASA tested a new supersonic aircraft designed to reduce sonic booms',
  } as any,
  {
    headline: 'Researchers trained pigeons to detect Wi-Fi passwords from rooftops',
    summary: 'No legitimate research supports the claim that pigeons can detect Wi-Fi passwords.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Hard',
    explanation: 'The claim mixes animal behavior with impossible cybersecurity abilities.',
    imagePrompt: 'pigeon rooftop city wifi router',
    title: 'Researchers trained pigeons to detect Wi-Fi passwords from rooftops',
  } as any,
  {
    headline: 'A museum created a silent disco tour where visitors dance through exhibits',
    summary: 'Museums and galleries have experimented with silent disco and audio-led tours.',
    type: 'REAL',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'Interactive cultural events like silent discos are a real format used in museums and public spaces.',
    imagePrompt: 'museum silent disco headphones art gallery',
    title: 'A museum created a silent disco tour where visitors dance through exhibits',
  } as any,
  {
    headline: 'Doctors confirmed that eating only purple foods triples memory overnight',
    summary: 'No medical evidence supports such a dramatic overnight memory improvement from a single-color diet.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Medium',
    explanation: 'Nutrition can affect health over time, but this specific claim is exaggerated and unsupported.',
    imagePrompt: 'healthy food berries vegetables nutrition',
    title: 'Doctors confirmed that eating only purple foods triples memory overnight',
  } as any,
  {
    headline: 'Engineers built a robot that can sort recycling faster than humans',
    summary: 'AI-powered recycling robots are already used in some facilities to sort waste efficiently.',
    type: 'REAL',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'Automated vision systems and robotic arms are used for high-speed waste sorting.',
    imagePrompt: 'recycling robot factory conveyor belt',
    title: 'Engineers built a robot that can sort recycling faster than humans',
  } as any,
  {
    headline: 'A town banned Mondays after a vote to improve public happiness',
    summary: 'No town can remove a weekday from the calendar, and there is no credible report of this happening.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Politics',
    difficulty: 'Easy',
    explanation: 'The claim is humorous but not plausible in any legal or administrative sense.',
    imagePrompt: 'town hall calendar meeting',
    title: 'A town banned Mondays after a vote to improve public happiness',
  } as any,
  {
    headline: 'Researchers are studying mushrooms that can break down plastic waste',
    summary: 'Scientists have studied fungi and enzymes that can help break down some plastics.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'Certain fungi and microbes show promise for breaking down plastic pollution.',
    imagePrompt: 'mushrooms forest lab plastic recycling',
    title: 'Researchers are studying mushrooms that can break down plastic waste',
  } as any,
  {
    headline: 'A startup launched perfume for laptops so emails smell more professional',
    summary: 'There is no credible evidence of a laptop perfume product tied to email professionalism.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Hard',
    explanation: 'The concept is satirical and not supported by credible reporting.',
    imagePrompt: 'laptop desk perfume office setup',
    title: 'A startup launched perfume for laptops so emails smell more professional',
  } as any,
  {
    headline: 'Cities are painting rooftops white to reduce urban heat',
    summary: 'Cool-roof programs are a real heat mitigation strategy in some cities.',
    type: 'REAL',
    imageUrl: '',
    category: 'Politics',
    difficulty: 'Medium',
    explanation: 'White or reflective roofs can reduce building heat absorption and urban temperatures.',
    imagePrompt: 'city rooftops white roofs aerial urban heat',
    title: 'Cities are painting rooftops white to reduce urban heat',
  } as any,
];

async function askLLM(payload: any) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.json();
}

function normalizeHeadline(headline: string) {
  return headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function rememberHeadlines(items: NewsItem[]) {
  for (const item of items) {
    const normalized = normalizeHeadline(item.headline || item.title || '');
    if (!normalized) continue;
    recentHeadlines.unshift(normalized);
  }

  if (recentHeadlines.length > 30) {
    recentHeadlines.length = 30;
  }
}

function isRecentHeadline(headline: string) {
  const normalized = normalizeHeadline(headline);
  return recentHeadlines.includes(normalized);
}

function buildImageUrl(rawPrompt: string, category?: string) {
  const prompt = encodeURIComponent(
    `${rawPrompt || 'news story'} ${category || ''} photo`.trim().replace(/\s+/g, ' ')
  );

  return `https://image.pollinations.ai/prompt/${prompt}?width=900&height=600&nologo=true&model=flux`;
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[\s*{[\s\S]*}\s*\]/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

function mapToNewsItem(item: any, index: number): NewsItem {
  const headline = item.headline || item.title || 'No headline';
  const explanation = item.explanation || item.summary || 'This is a viral news story.';
  const category = ['Politics', 'Tech', 'Science', 'Culture', 'Health'].includes(item.category)
    ? item.category
    : 'Science';
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(item.difficulty)
    ? item.difficulty
    : 'Medium';
  const imagePrompt = item.imagePrompt || `${headline} ${category}`;

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: headline,
    headline,
    type: item.type === 'FAKE' ? 'FAKE' : 'REAL',
    imageUrl: buildImageUrl(imagePrompt, category),
    summary: explanation,
    explanation,
    category,
    difficulty,
    imagePrompt,
  } as NewsItem;
}

function getFallbackRound(count: number): NewsItem[] {
  const shuffled = [...FALLBACK_ITEMS].sort(() => Math.random() - 0.5);
  const unique = shuffled.filter(item => !isRecentHeadline(item.headline)).slice(0, count);
  const source = unique.length >= count ? unique : shuffled.slice(0, count);
  const mapped = source.map((item, index) => mapToNewsItem(item, index));
  rememberHeadlines(mapped);
  return mapped;
}

async function requestFreshRound(count: number): Promise<NewsItem[]> {
  const recentBlock = recentHeadlines.slice(0, 15).join(' | ');

  const res = await askLLM({
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY a JSON array. Create diverse viral-news quiz items across politics, tech, science, culture, and health. Mix real and fake items. Avoid repeating previous topics or wording. Each item must include headline, type, category, difficulty, explanation, and imagePrompt. Keep explanations short, factual, and educational.',
      },
      {
        role: 'user',
        content: `Generate ${count} unique viral news quiz items in JSON format:
[
  {
    "headline": "...",
    "type": "REAL" or "FAKE",
    "category": "Politics" | "Tech" | "Science" | "Culture" | "Health",
    "difficulty": "Easy" | "Medium" | "Hard",
    "explanation": "1-2 sentence truth summary for players",
    "imagePrompt": "short visual prompt for a contextual news-style image"
  }
]

Rules:
- Do not reuse or closely paraphrase any recent headlines.
- Make the set feel varied in subject, tone, and geography.
- Avoid Elon Musk, octopus hearts, cats barking, and other overused examples unless absolutely necessary.
- Recent headlines to avoid: ${recentBlock || 'none'}`,
      },
    ],
  });

  const content = res?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content');

  const parsed = safeParse(content);
  if (!parsed || !Array.isArray(parsed)) throw new Error('Parse failed');

  const formatted = parsed
    .map((item: any, index: number) => mapToNewsItem(item, index))
    .filter((item: NewsItem) => !isRecentHeadline(item.headline));

  if (!formatted.length) throw new Error('All generated items were duplicates');

  rememberHeadlines(formatted);
  return formatted.slice(0, count);
}

export async function generateQuizRound(count = 5): Promise<NewsItem[]> {
  try {
    if (cachedRound && cachedRound.length >= count) {
      const data = cachedRound.slice(0, count);
      cachedRound = null;
      rememberHeadlines(data);
      return data;
    }

    return await requestFreshRound(count);
  } catch (err) {
    console.error(err);
    return getFallbackRound(count);
  }
}

export async function preloadRound() {
  try {
    cachedRound = await requestFreshRound(5);
  } catch {
    cachedRound = getFallbackRound(5);
  }
}
