let leaderboard: { name: string; score: number }[] = [];

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(
      leaderboard.sort((a, b) => b.score - a.score).slice(0, 10)
    );
  }

  if (req.method === "POST") {
    const { name, score } = req.body;

    if (!name || typeof score !== "number") {
      return res.status(400).json({ error: "Invalid data" });
    }

    leaderboard.push({ name, score });

    leaderboard = leaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
