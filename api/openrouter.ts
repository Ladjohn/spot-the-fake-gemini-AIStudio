export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages } = req.body;

    const PRIMARY_MODEL = "meta-llama/llama-3-8b-instruct";
    const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

    // 🔥 timeout wrapper (prevents hanging)
    const fetchWithTimeout = (url, options, timeout = 8000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        )
      ]);
    };

    const callModel = async (model) => {
      try {
        const response = await fetchWithTimeout(
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
          },
          8000 // ⏱️ max 8 seconds
        );

        const data = await response.json();
        return data;
      } catch (err) {
        console.warn(`Model ${model} failed:`, err.message);
        return null;
      }
    };

    // 🔥 TRY PRIMARY
    let data = await callModel(PRIMARY_MODEL);

    console.log("PRIMARY RESPONSE:", data);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🔥 FALLBACK
    data = await callModel(FALLBACK_MODEL);

    console.log("FALLBACK RESPONSE:", data);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🔥 FINAL SAFE RESPONSE (prevents blank UI)
    return res.status(200).json({
      choices: [
        {
          message: {
            content: JSON.stringify([
              { headline: "AI is warming up... try again!", type: "FAKE" },
              { headline: "Octopus has 3 hearts", type: "REAL" }
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
              { headline: "Bananas are berries", type: "REAL" }
            ])
          }
        }
      ]
    });
  }
}
