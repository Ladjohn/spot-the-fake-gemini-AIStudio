export default async function handler(req, res) {
  try {
    const { model, ...payload } = req.body;

    // 🔥 HUGGINGFACE ROUTE
    if (model?.startsWith('hf/')) {
      const HF_KEY = process.env.HUGGINGFACE_API_KEY;

      if (!HF_KEY) {
        return res.status(500).json({ error: 'Missing HF key' });
      }

      const hfModel = model.replace('hf/', '');
      const hfUrl = `https://api-inference.huggingface.co/models/${hfModel}`;

      const prompt = payload.messages
        ?.map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const response = await fetch(hfUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: payload.max_tokens || 300,
            temperature: payload.temperature || 0.7
          }
        })
      });

      const text = await response.text();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      // 🔥 Normalize to OpenAI format
      if (Array.isArray(parsed) && parsed[0]?.generated_text) {
        return res.status(200).json({
          choices: [
            {
              message: {
                content: parsed[0].generated_text
              }
            }
          ]
        });
      }

      return res.status(200).send(parsed);
    }

    // 🔥 OPENROUTER ROUTE
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OR_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, ...payload })
    });

    const data = await response.text();
    return res.status(200).send(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "LLM proxy failed" });
  }
}
