// /api/tts.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Simple Vercel serverless TTS proxy for OpenRouter (adjust payload/endpoint if needed).
 * Expects POST { text: string }
 * Returns: 200 { mime: string, data: string(base64) }
 *
 * Set OPENROUTER_API_KEY as a secret/environment variable on Vercel (server-side only).
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return res.status(500).json({ error: "Missing server OPENROUTER_API_KEY" });

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text in body" });

  try {
    // --- NOTE ---
    // OpenRouter's exact TTS endpoint/payload may differ. The endpoint below is a commonly used pattern,
    // but if your provider requires a different path or payload shape, replace accordingly.
    // If OpenRouter returns JSON with base64, adapt parsing. This sample attempts to accept binary too.

    const payload = {
      model: "gpt-4o-mini-tts", // adjust if needed; provider-specific
      input: text,
      voice: "alloy", // adjust voice name if needed
      // provider specific options can be added here
    };

    const providerResp = await fetch("https://openrouter.ai/api/v1/audio/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    // If provider returns non-OK, forward error
    if (!providerResp.ok) {
      const txt = await providerResp.text();
      console.error("TTS provider error:", providerResp.status, txt);
      return res.status(500).json({ error: "TTS provider error", detail: txt });
    }

    // Try to detect returned content-type
    const contentType = providerResp.headers.get("content-type") || "";

    // Case A: provider returns binary audio (wav/mp3/ogg)
    if (contentType.startsWith("audio/")) {
      const buffer = Buffer.from(await providerResp.arrayBuffer());
      const base64 = buffer.toString("base64");
      return res.status(200).json({ mime: contentType, data: base64 });
    }

    // Case B: provider returns JSON that contains base64 audio in a field
    // e.g. { mime: "audio/wav", data: "<base64>" } or provider-specific
    const bodyText = await providerResp.text();

    try {
      const parsed = JSON.parse(bodyText);
      // try common field names
      if (parsed?.data && parsed?.mime) {
        return res.status(200).json({ mime: parsed.mime, data: parsed.data });
      }
      // Some providers return { audio: "<base64>" } or nested paths — try common fallbacks:
      if (parsed?.audio) return res.status(200).json({ mime: parsed?.mime ?? "audio/wav", data: parsed.audio });
      if (parsed?.result?.data) return res.status(200).json({ mime: parsed?.result?.mime ?? "audio/wav", data: parsed.result.data });
    } catch (e) {
      // not JSON — fallthrough
    }

    // Case C: provider returned text (maybe it's actually base64 text)
    // If text looks like base64 (very long), assume WAV mime (best-effort)
    const maybeBase64 = bodyText.trim();
    if (maybeBase64.length > 200 && /^[A-Za-z0-9+/=]+\s*$/.test(maybeBase64.slice(0, 200))) {
      return res.status(200).json({ mime: "audio/wav", data: maybeBase64 });
    }

    // Unknown format — return raw body for debugging
    return res.status(500).json({ error: "Unrecognized TTS response", raw: bodyText, contentType });
  } catch (err: any) {
    console.error("TTS proxy error", err);
    return res.status(500).json({ error: String(err) });
  }
}
