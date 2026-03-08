import type { FileTreeEntry } from "@shared/types";

export interface FileMatch {
  name: string;
  path: string;
  score: number;
  matches: number[]; // indices of matched chars in name
}

export function flattenFiles(entries: FileTreeEntry[]): { name: string; path: string }[] {
  const result: { name: string; path: string }[] = [];
  const walk = (items: FileTreeEntry[]) => {
    for (const item of items) {
      if (item.type === "file") {
        result.push({ name: item.name.replace(/\.md$/, ""), path: item.path });
      }
      if (item.children) walk(item.children);
    }
  };
  walk(entries);
  return result;
}

export function fuzzyMatch(query: string, files: { name: string; path: string }[]): FileMatch[] {
  if (!query) {
    return files.map((f) => ({ ...f, score: 0, matches: [] }));
  }

  const q = query.toLowerCase();
  const results: FileMatch[] = [];

  for (const file of files) {
    const target = file.name.toLowerCase();
    const indices: number[] = [];
    let qi = 0;

    for (let ti = 0; ti < target.length && qi < q.length; ti++) {
      if (target[ti] === q[qi]) {
        indices.push(ti);
        qi++;
      }
    }

    if (qi < q.length) continue; // not all chars matched

    // Score: prefer consecutive matches, word starts, and early positions
    let score = 0;
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      // Consecutive bonus
      if (i > 0 && indices[i] === indices[i - 1] + 1) score += 10;
      // Word start bonus (first char or after separator)
      if (idx === 0 || /[\s\-_/]/.test(target[idx - 1])) score += 5;
      // Early position bonus
      score += Math.max(0, 10 - idx);
    }

    results.push({ ...file, score, matches: indices });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
