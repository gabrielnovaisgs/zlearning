import { useQuery } from '@tanstack/react-query';
import { fs } from '@shared/services/filesystem';
import type { FileTreeEntry } from '@shared/types';

export const FILES_QUERY_KEY = ['files'] as const;

export function useFiles(): { fileTree: FileTreeEntry[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: FILES_QUERY_KEY,
    queryFn: () => fs.listFiles(),
  });
  return { fileTree: data ?? [], isLoading };
}

export function useFileContent(filePath: string): { content: string | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['file-content', filePath] as const,
    queryFn: () => fs.readFile(filePath),
    staleTime: Infinity, // editor is authoritative; don't auto-refetch
  });
  return { content: data?.content ?? null, isLoading };
}
