import { Router } from "express";
import { createLLMProvider } from "../services/llm.js";

export function createTranslateRouter(): Router {
  const router = Router();

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

  return router;
}
