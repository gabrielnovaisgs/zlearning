import { create } from "zustand";

// ── Interfaces ───────────────────────────────────────────────────────────────

interface PdfStoreActions {
  setTarget: (id: string) => void;
  clearTarget: () => void;
}

interface PdfStoreState {
  highlightTarget: string | null;
  actions: PdfStoreActions;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const usePdfStore = create<PdfStoreState>()((set, get) => ({
  highlightTarget: null,

  actions: {
    setTarget(id) {
      set({ highlightTarget: id });
    },

    clearTarget() {
      if (get().highlightTarget === null) return;
      set({ highlightTarget: null });
    },
  },
}));

