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
