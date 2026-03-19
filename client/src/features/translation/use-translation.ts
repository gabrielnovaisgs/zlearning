import { useMutation } from '@tanstack/react-query';
import { translateText, getExamples, type TranslationExample } from './translation.service';

interface UseTranslationReturn {
  translation: string;
  isTranslating: boolean;
  translationError: string;
  translate: () => void;

  examples: TranslationExample[];
  isFetchingExamples: boolean;
  examplesError: string;
  hasRequestedExamples: boolean;
  fetchExamples: () => void;
}

export function useTranslation(text: string): UseTranslationReturn {
  const translateMutation = useMutation({
    mutationFn: (t: string) => translateText(t),
  });

  const examplesMutation = useMutation({
    mutationFn: (t: string) => getExamples(t),
  });

  return {
    translation: translateMutation.data ?? '',
    isTranslating: translateMutation.isPending,
    translationError: translateMutation.error instanceof Error
      ? translateMutation.error.message
      : '',
    translate: () => translateMutation.mutate(text),

    examples: examplesMutation.data ?? [],
    isFetchingExamples: examplesMutation.isPending,
    examplesError: examplesMutation.error instanceof Error
      ? examplesMutation.error.message
      : '',
    hasRequestedExamples: !examplesMutation.isIdle,
    fetchExamples: () => examplesMutation.mutate(text),
  };
}
