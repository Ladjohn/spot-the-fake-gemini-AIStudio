import { NewsItem } from '../types';
import { getSeenHeadlines, setSeenHeadlines } from '../utils/storage';

const TRIVIA_ENDPOINT = 'https://opentdb.com/api.php';
const MAX_RECENT_HEADLINES = 120;

let cachedRound: NewsItem[] | null = null;
const recentHeadlines: string[] = getSeenHeadlines();

const FALLBACK_ITEMS: Array<Omit<NewsItem, 'id'>> = [
  {
    headline: 'Octopuses have three hearts',
    summary: 'This statement is real. Octopuses have two hearts that move blood through the gills and one that moves blood through the body.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is real. Octopuses have a three-heart circulatory system.',
    imagePrompt: 'octopus underwater marine biology',
    title: 'Octopuses have three hearts',
  } as any,
  {
    headline: 'Humans can breathe normally in space without a suit',
    summary: 'This statement is fake. Space is a near-vacuum, and humans need pressure and oxygen to survive there.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Astronauts need spacesuits or pressurized spacecraft.',
    imagePrompt: 'astronaut spacesuit outer space',
    title: 'Humans can breathe normally in space without a suit',
  } as any,
  {
    headline: 'The Great Wall of China was built in a single weekend',
    summary: 'This statement is fake. The wall system was built, rebuilt, and expanded across many centuries.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Culture',
    difficulty: 'Easy',
    explanation: 'This statement is fake. The Great Wall was a long-term construction effort across multiple dynasties.',
    imagePrompt: 'great wall of china mountain landscape',
    title: 'The Great Wall of China was built in a single weekend',
  } as any,
  {
    headline: 'Lightning can strike the same place more than once',
    summary: 'This statement is real. Tall buildings, towers, and exposed objects can be struck repeatedly.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is real. The idea that lightning never strikes twice is a myth.',
    imagePrompt: 'lightning storm tall skyscraper',
    title: 'Lightning can strike the same place more than once',
  } as any,
  {
    headline: 'A computer virus can spread through a glass of water',
    summary: 'This statement is fake. Computer viruses are malicious code, not biological germs in drinking water.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Digital malware spreads through computer systems and networks.',
    imagePrompt: 'computer virus warning screen glass water desk',
    title: 'A computer virus can spread through a glass of water',
  } as any,
  {
    headline: 'The human heart has four chambers',
    summary: 'This statement is real. The heart has two atria and two ventricles.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Easy',
    explanation: 'This statement is real. A human heart has four chambers.',
    imagePrompt: 'human heart medical illustration doctor',
    title: 'The human heart has four chambers',
  } as any,
  {
    headline: 'Sound travels faster in air than in water',
    summary: 'This statement is fake. Sound usually travels faster in water than in air.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'This statement is fake. Sound waves move faster through water because its particles are closer together.',
    imagePrompt: 'sound wave underwater ocean science',
    title: 'Sound travels faster in air than in water',
  } as any,
  {
    headline: 'The first programmable computers were the size of modern smartphones',
    summary: 'This statement is fake. Early programmable computers were room-sized machines.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Tech',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Early computers used large cabinets, cables, tubes, and panels.',
    imagePrompt: 'vintage room sized computer old technology',
    title: 'The first programmable computers were the size of modern smartphones',
  } as any,
  {
    headline: 'Some mushrooms can glow in the dark',
    summary: 'This statement is real. Some fungi are bioluminescent and can produce visible light.',
    type: 'REAL',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Medium',
    explanation: 'This statement is real. Bioluminescent fungi exist in nature.',
    imagePrompt: 'glowing mushrooms dark forest bioluminescent fungi',
    title: 'Some mushrooms can glow in the dark',
  } as any,
  {
    headline: 'Every country in the world uses the exact same currency',
    summary: 'This statement is fake. Countries and regions use many different currencies.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Politics',
    difficulty: 'Easy',
    explanation: 'This statement is fake. Examples include the dollar, euro, yen, rupee, pound, and many more.',
    imagePrompt: 'international money currencies banknotes coins',
    title: 'Every country in the world uses the exact same currency',
  } as any,
  {
    headline: 'Vaccines train the immune system to recognize specific threats',
    summary: 'This statement is real. Vaccines help the immune system prepare defenses against certain diseases.',
    type: 'REAL',
    imageUrl: '',
    category: 'Health',
    difficulty: 'Medium',
    explanation: 'This statement is real. Vaccines work by preparing immune memory.',
    imagePrompt: 'vaccine syringe immune system medical clinic',
    title: 'Vaccines train the immune system to recognize specific threats',
  } as any,
  {
    headline: 'The Moon produces its own sunlight like a small star',
    summary: 'This statement is fake. The Moon appears bright because it reflects sunlight.',
    type: 'FAKE',
    imageUrl: '',
    category: 'Science',
    difficulty: 'Easy',
    explanation: 'This statement is fake. The Moon reflects light from the Sun.',
    imagePrompt: 'moon night sky reflected sunlight',
    title: 'The Moon produces its own sunlight like a small star',
  } as any,
];

async function fetchTriviaQuestions(count: number) {
  const url = new URL(TRIVIA_ENDPOINT);
  url.searchParams.set('amount', String(count));
  url.searchParams.set('type', 'boolean');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Trivia request failed');

  const data = await res.json();
  if (!Array.isArray(data?.results) || data.response_code !== 0) {
    throw new Error('No trivia results');
  }

  return data.results;
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeHeadline(headline: string) {
  return headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function rememberHeadlines(items: NewsItem[]) {
  for (const item of items) {
    const normalized = normalizeHeadline(item.headline || item.title || '');
    if (!normalized || recentHeadlines.includes(normalized)) continue;
    recentHeadlines.unshift(normalized);
  }

  if (recentHeadlines.length > MAX_RECENT_HEADLINES) {
    recentHeadlines.length = MAX_RECENT_HEADLINES;
  }

  setSeenHeadlines(recentHeadlines);
}

function isRecentHeadline(headline: string) {
  return recentHeadlines.includes(normalizeHeadline(headline));
}

function buildImageUrl(rawPrompt: string, category?: string) {
  const prompt = encodeURIComponent(
    `${rawPrompt || 'trivia statement'} ${category || ''} photo`.trim().replace(/\s+/g, ' ')
  );

  return `https://image.pollinations.ai/prompt/${prompt}?width=900&height=600&nologo=true&model=flux`;
}

function getGameCategory(triviaCategory?: string): NewsItem['category'] {
  const category = (triviaCategory || '').toLowerCase();

  if (category.includes('science') || category.includes('nature') || category.includes('math')) return 'Science';
  if (category.includes('computer') || category.includes('gadget')) return 'Tech';
  if (category.includes('politics') || category.includes('history') || category.includes('geography')) return 'Politics';
  if (category.includes('animal') || category.includes('sport') || category.includes('film') || category.includes('music') || category.includes('book')) return 'Culture';
  return 'Culture';
}

function getGameDifficulty(triviaDifficulty?: string): NewsItem['difficulty'] {
  if (triviaDifficulty === 'easy') return 'Easy';
  if (triviaDifficulty === 'hard') return 'Hard';
  return 'Medium';
}

function mapTriviaToNewsItem(item: any, index: number): NewsItem {
  const statement = decodeHtml(String(item.question || 'No statement')).replace(/\s+/g, ' ').trim();
  const isReal = item.correct_answer === 'True';
  const category = getGameCategory(item.category);
  const difficulty = getGameDifficulty(item.difficulty);
  const imagePrompt = `${statement} trivia quiz ${category}`;
  const truthLabel = isReal ? 'real' : 'fake';
  const summary = `This statement is ${truthLabel}. Open Trivia Database lists the correct true/false answer as ${item.correct_answer}.`;

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: statement,
    headline: statement,
    type: isReal ? 'REAL' : 'FAKE',
    imageUrl: buildImageUrl(imagePrompt, category),
    summary,
    explanation: summary,
    category,
    difficulty,
    source: 'Open Trivia Database',
    imagePrompt,
  };
}

function mapFallbackToNewsItem(item: Omit<NewsItem, 'id'>, index: number): NewsItem {
  const headline = item.headline || item.title || 'No statement';
  const category = item.category || 'Culture';

  return {
    ...item,
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: headline,
    headline,
    imageUrl: buildImageUrl(item.imagePrompt || headline, category),
    source: 'Fallback question bank',
  } as NewsItem;
}

function uniqueOnly(items: NewsItem[]) {
  const seenThisBatch = new Set<string>();

  return items.filter(item => {
    const normalized = normalizeHeadline(item.headline);
    if (!normalized || isRecentHeadline(item.headline) || seenThisBatch.has(normalized)) {
      return false;
    }

    seenThisBatch.add(normalized);
    return true;
  });
}

function getFallbackRound(count: number): NewsItem[] {
  const shuffled = [...FALLBACK_ITEMS].sort(() => Math.random() - 0.5);
  const unique = shuffled
    .filter(item => !isRecentHeadline(item.headline))
    .slice(0, count)
    .map((item, index) => mapFallbackToNewsItem(item, index));

  const mapped = unique.length >= count
    ? unique
    : shuffled.slice(0, count).map((item, index) => mapFallbackToNewsItem(item, index));

  rememberHeadlines(mapped);
  return mapped;
}

async function requestFreshRound(count: number): Promise<NewsItem[]> {
  const requestedCount = Math.min(50, Math.max(count + 8, count * 3));
  const triviaItems = await fetchTriviaQuestions(requestedCount);
  const uniqueItems = uniqueOnly(triviaItems.map(mapTriviaToNewsItem));

  if (uniqueItems.length < count) {
    throw new Error('Not enough unique trivia statements');
  }

  const selected = uniqueItems.slice(0, count);
  rememberHeadlines(selected);
  return selected;
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
