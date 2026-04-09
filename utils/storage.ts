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

export function getThemePreference(): ThemePreference | null {
  const value = localStorage.getItem(THEME_PREFERENCE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function setThemePreference(theme: ThemePreference) {
  localStorage.setItem(THEME_PREFERENCE_KEY, theme);
}
