export interface TranslationExample {
  original: string;
  translation: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: (T & { error?: string }) | { error?: string } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // empty or non-JSON body
  }
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${response.status})`,
    );
  }
  return data as T;
}

export async function translateText(
  text: string,
  from = "en-US",
  to = "pt-BR",
): Promise<string> {
  const data = await postJson<{ translation: string }>("/api/translate", { text, from, to });
  return data.translation ?? "";
}

export async function getExamples(
  text: string,
  from = "en-US",
  to = "pt-BR",
): Promise<TranslationExample[]> {
  const data = await postJson<{ examples: TranslationExample[] }>(
    "/api/translate/examples",
    { text, from, to },
  );
  return data.examples ?? [];
}
