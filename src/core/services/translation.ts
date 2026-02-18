export async function translateText(
  text: string,
  from = "en",
  to = "pt",
): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from, to }),
  });

  let data: { translation?: string; error?: string } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // empty or non-JSON body
  }

  if (!response.ok) {
    throw new Error(data.error ?? `Translation failed (${response.status})`);
  }

  return data.translation ?? "";
}
