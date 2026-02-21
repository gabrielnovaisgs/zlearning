import { Router } from "express";
import { createLLMProvider } from "../services/llm.js";

export interface Example {
  original: string;
  translation: string;
}

function extractJson(raw: string): unknown {
  // Strip markdown code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : raw;
  // Find first [ ... ] block
  const start = src.indexOf("[");
  const end = src.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found");
  return JSON.parse(src.slice(start, end + 1));
}

export function createTranslateRouter(): Router {
  const router = Router();

  // POST /api/translate — translate text
  router.post("/", async (req, res) => {
    const { text, from = "en", to = "pt" } = req.body as {
      text?: string;
      from?: string;
      to?: string;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    return res.status(200).json({ translation: `${text} (translated from ${from} to ${to})` }); // MOCK

    try {
      const provider = createLLMProvider();
      const prompt =
        `Translate the following text from ${from} to ${to}. ` +
        `Return only the translation, with no explanations or extra text.\n\n${text}`;
      const translation = await provider.complete(prompt);
      res.json({ translation: translation.trim() });
    } catch (err: unknown) {
      console.error("Translation error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("OPEN_ROUTER_API_KEY")) {
        res.status(503).json({ error: "Translation service not configured" });
      } else {
        res.status(500).json({ error: "Translation failed" });
      }
    }
  });

  // POST /api/translate/examples — get usage examples for a word/phrase
  router.post("/examples", async (req, res) => {
    const { text, from = "en", to = "pt" } = req.body as {
      text?: string;
      from?: string;
      to?: string;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    try {
      const provider = createLLMProvider();
      const prompt =
        `Give me 3 short example sentences in ${from} that naturally use the word or phrase: "${text}"\n` +
        `For each example provide the original ${from} sentence and its ${to} translation.\n` +
        `Respond ONLY with a JSON array, no markdown, no explanation:\n` +
        `[{"original":"...","translation":"..."},{"original":"...","translation":"..."},{"original":"...","translation":"..."}]`;
      const raw = await provider.complete(prompt);
      const parsed = extractJson(raw) as Example[];
      if (!Array.isArray(parsed)) throw new Error("Unexpected response shape");
      const examples: Example[] = parsed
        .filter((e) => typeof e.original === "string" && typeof e.translation === "string")
        .slice(0, 3);
      res.json({ examples });
    } catch (err: unknown) {
      console.error("Examples error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("OPEN_ROUTER_API_KEY")) {
        res.status(503).json({ error: "Translation service not configured" });
      } else {
        res.status(500).json({ error: "Failed to fetch examples" });
      }
    }
  });

  return router;
}
