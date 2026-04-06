export async function submitScore(name: string, score: number) {
  try {
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, score })
    });
  } catch {}
}

export async function fetchLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    return res.json();
  } catch {
    return [];
  }
}
