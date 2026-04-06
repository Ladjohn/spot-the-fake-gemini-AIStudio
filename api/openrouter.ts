export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages } = req.body;

    // ✅ WORKING MODELS (FREE + AVAILABLE)
    const PRIMARY_MODEL = "meta-llama/llama-3-8b-instruct";
    const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

    const callModel = async (model) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages
        })
      });

      const data = await response.json();
      return data;
    };

    // 🔥 TRY PRIMARY
    let data = await callModel(PRIMARY_MODEL);

    console.log("PRIMARY RESPONSE:", data);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    console.warn("Primary failed, trying fallback...");

    // 🔥 FALLBACK
    data = await callModel(FALLBACK_MODEL);

    console.log("FALLBACK RESPONSE:", data);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    return res.status(500).json({ error: "All models failed", data });

  } catch (err) {
    console.error("FINAL ERROR:", err);
    return res.status(500).json({ error: "LLM proxy failed" });
  }
}
