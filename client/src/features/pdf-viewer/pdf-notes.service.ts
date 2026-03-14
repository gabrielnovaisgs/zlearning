export async function fetchPdfNoteInfo(
  pdfPath: string,
): Promise<{ exists: boolean; notesPath: string }> {
  const res = await fetch(
    `/api/pdf/notes?pdfPath=${encodeURIComponent(pdfPath)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch note info: ${res.status}`);
  return res.json();
}

export async function createPdfNote(
  pdfPath: string,
  createStudyModule: boolean,
): Promise<{ notesPath: string; newPdfPath: string }> {
  const res = await fetch(`/api/pdf/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfPath, createStudyModule }),
  });
  if (!res.ok) throw new Error(`Failed to create note: ${res.status}`);
  return res.json();
}
