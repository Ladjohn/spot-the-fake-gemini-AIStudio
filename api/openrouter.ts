export default async function handler(req, res) {
  try {
    const { model, ...payload } = req.body;

    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    // 🔥 PRIMARY MODEL (FAST + FREE)
    const PRIMARY_MODEL = "mistralai/mistral-7b-instruct";

    // 🔥 FALLBACK MODEL
    const FALLBACK_MODEL = "meta-llama/llama-3-8b-instruct";

    // 🔥 FUNCTION TO CALL OPENROUTER
    const callOpenRouter = async (selectedModel) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          ...payload
        })
      });

      const text = await response.text();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      return { response, parsed };
    };

    // 🔥 1. TRY PRIMARY MODEL
    try {
      const { response, parsed } = await callOpenRouter(PRIMARY_MODEL);

      if (response.ok && parsed?.choices?.[0]?.message?.content) {
        return res.status(200).json(parsed);
      }

      console.warn("Primary model failed:", parsed);
    } catch (err) {
      console.error("Primary model error:", err);
    }

    // 🔥 2. FALLBACK MODEL
    try {
      const { response, parsed } = await callOpenRouter(FALLBACK_MODEL);

      if (response.ok && parsed?.choices?.[0]?.message?.content) {
        return res.status(200).json(parsed);
      }

      console.warn("Fallback model failed:", parsed);
    } catch (err) {
      console.error("Fallback model error:", err);
    }

    return res.status(500).json({ error: "All models failed" });

  } catch (err) {
    console.error("FINAL ERROR:", err);
    res.status(500).json({ error: "LLM proxy failed" });
  }
}
