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

    // Always return fallback questions
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            { headline: "Octopus has 3 hearts", type: "REAL", explanation: "Octopuses have three hearts." },
            { headline: "Bananas are berries", type: "REAL", explanation: "Botanically, bananas are berries." },
            { headline: "Penguins live in the Arctic", type: "FAKE", explanation: "Penguins live in Antarctica, not the Arctic." },
            { headline: "Honey never spoils", type: "REAL", explanation: "Honey can last indefinitely." },
            { headline: "Humans use only 10% of their brains", type: "FAKE", explanation: "We use virtually all of our brain." }
          ])
        }
      }]
    });

  } catch (err) {
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            { headline: "Octopus has 3 hearts", type: "REAL", explanation: "Octopuses have three hearts." },
            { headline: "Bananas are berries", type: "REAL", explanation: "Botanically, bananas are berries." },
            { headline: "Penguins live in the Arctic", type: "FAKE", explanation: "Penguins live in Antarctica, not the Arctic." },
            { headline: "Honey never spoils", type: "REAL", explanation: "Honey can last indefinitely." },
            { headline: "Humans use only 10% of their brains", type: "FAKE", explanation: "We use virtually all of our brain." }
          ])
        }
      }]
    });
  }
}
