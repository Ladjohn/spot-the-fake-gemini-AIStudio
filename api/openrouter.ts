export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages } = req.body;

    const PRIMARY_MODEL = "meta-llama/llama-3-8b-instruct";
    const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

    // 🔥 timeout wrapper
    const fetchWithTimeout = async (url, options, timeout = 8000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        return await response.json();
      } catch (err) {
        console.warn("Fetch timeout/error:", err.message);
        return null;
      } finally {
        clearTimeout(id);
      }
    };

    const callModel = async (model) => {
      const data = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages
          })
        }
      );

      return data;
    };

    // 🔥 TRY PRIMARY
    let data = await callModel(PRIMARY_MODEL);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🔁 FALLBACK
    data = await callModel(FALLBACK_MODEL);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🛡️ FINAL SAFE RESPONSE
    return res.status(200).json({
      choices: [
        {
          message: {
            content: JSON.stringify([
              { headline: "AI is warming up... try again!", type: "FAKE" },
              { headline: "Octopus has 3 hearts", type: "REAL" },
              { headline: "Sharks existed before trees", type: "REAL" },
              { headline: "Humans can breathe underwater", type: "FAKE" },
              { headline: "Bananas are berries", type: "REAL" }
            ])
          }
        }
      ]
    });

  } catch (err) {
    console.error("FINAL ERROR:", err);

    return res.status(200).json({
      choices: [
        {
          message: {
            content: JSON.stringify([
              { headline: "Server busy, retrying...", type: "FAKE" },
              { headline: "Octopus has 3 hearts", type: "REAL" },
              { headline: "Dogs can speak English", type: "FAKE" },
              { headline: "Earth revolves around Sun", type: "REAL" },
              { headline: "Aliens run governments", type: "FAKE" }
            ])
          }
        }
      ]
    });
  }
}
