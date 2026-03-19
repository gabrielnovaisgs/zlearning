import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@shared/query-client';
import { FILES_QUERY_KEY } from '@shared/hooks/use-files';
import { fetchPdfNoteInfo, createPdfNote } from './pdf-notes.service';

interface UsePdfNotesReturn {
  noteExists: boolean | null; // null = still loading
  notesPath: string;
  isLoading: boolean;
  createNote: (createStudyModule: boolean) => Promise<{ notesPath: string; newPdfPath: string }>;
  isCreating: boolean;
}

export function usePdfNotes(pdfPath: string): UsePdfNotesReturn {
  const { data: noteInfo, isLoading } = useQuery({
    queryKey: ['pdf-note-info', pdfPath] as const,
    queryFn: () => fetchPdfNoteInfo(pdfPath),
    enabled: Boolean(pdfPath),
  });

  const createMutation = useMutation({
    mutationFn: ({ pdfPath: p, createStudyModule }: { pdfPath: string; createStudyModule: boolean }) =>
      createPdfNote(p, createStudyModule),
    onSuccess: (_data, variables) => {
      // Use variables.pdfPath (the actual value used in the mutation) rather than
      // the closed-over pdfPath to avoid stale closure if the prop changes mid-flight.
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pdf-note-info', variables.pdfPath] });
    },
  });

  return {
    noteExists: isLoading ? null : (noteInfo?.exists ?? false),
    notesPath: noteInfo?.notesPath ?? '',
    isLoading,
    createNote: (createStudyModule: boolean) =>
      createMutation.mutateAsync({ pdfPath, createStudyModule }),
    isCreating: createMutation.isPending,
  };
}
