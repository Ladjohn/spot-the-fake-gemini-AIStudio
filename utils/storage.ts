export function getPlayerName() {
  return localStorage.getItem("playerName") || "";
}

export function setPlayerName(name: string) {
  localStorage.setItem("playerName", name);
}

export function getHighScore() {
  return Number(localStorage.getItem("highScore") || 0);
}

export function setHighScore(score: number) {
  localStorage.setItem("highScore", String(score));
}

export type ThemePreference = "light" | "dark";

const THEME_PREFERENCE_KEY = "themePreference";
const SEEN_HEADLINES_KEY = "seenHeadlines";

export function getThemePreference(): ThemePreference | null {
  const value = localStorage.getItem(THEME_PREFERENCE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function setThemePreference(theme: ThemePreference) {
  localStorage.setItem(THEME_PREFERENCE_KEY, theme);
}

export function getSeenHeadlines() {
  try {
    const value = localStorage.getItem(SEEN_HEADLINES_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function setSeenHeadlines(headlines: string[]) {
  localStorage.setItem(SEEN_HEADLINES_KEY, JSON.stringify(headlines));
}
