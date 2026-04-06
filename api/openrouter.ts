export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages } = req.body;

    // 🔥 FORCE MODEL (ignore frontend completely)
    const MODEL = "mistralai/mistral-7b-instruct";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OR_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages
      })
    });

    const data = await response.json();

    console.log("OPENROUTER RESPONSE:", data);

    return res.status(200).json(data);

  } catch (err) {
    console.error("FINAL ERROR:", err);
    return res.status(500).json({ error: "LLM proxy failed" });
  }
}
