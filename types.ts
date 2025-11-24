export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  type: 'REAL' | 'FAKE';
  imageUrl: string;
  category: 'Politics' | 'Tech' | 'Science' | 'Culture' | 'Health';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source?: string;
  explanation?: string; // Pre-generated brief explanation
  imagePrompt?: string; // Specific prompt for image generation
}

export interface QuizState {
  currentRound: number;
  totalRoundsPlayed: number;
  score: number;
  streak: number;
  lives: number;
  history: { itemId: string; correct: boolean; timeTaken: number }[];
  status: 'IDLE' | 'PLAYING' | 'ANALYSIS' | 'GAME_OVER' | 'COMPLETED';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  highScore: number; // Personal best
}

export interface VerificationResult {
  authenticityScore: number; // 0 to 1
  verdict: 'Likely Authentic' | 'Unverifiable' | 'Debunked' | 'Suspicious';
  reasoning: string;
  sources: { title: string; uri: string }[];
  visualArtifacts: string[];
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  streak: number;
  date: string;
}