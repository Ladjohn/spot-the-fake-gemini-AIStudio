export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages } = req.body;

    const PRIMARY = "meta-llama/llama-3-8b-instruct";
    const FALLBACK = "mistralai/mistral-7b-instruct:free";

    const fetchWithTimeout = (model) =>
      Promise.race([
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model, messages })
        }).then(res => res.json()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        )
      ]);

    let data = await fetchWithTimeout(PRIMARY);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    data = await fetchWithTimeout(FALLBACK);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🔥 always return something (no blank UI)
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            { headline: "AI warming up...", type: "FAKE" },
            { headline: "Bananas are berries", type: "REAL" }
          ])
        }
      }]
    });

  } catch (err) {
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            { headline: "Server busy...", type: "FAKE" }
          ])
        }
      }]
    });
  }
}
