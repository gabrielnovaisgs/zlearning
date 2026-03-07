type Listener = () => void;

class PdfStore {
  private highlightTarget: string | null = null;
  private listeners = new Set<Listener>();

  getState(): string | null {
    return this.highlightTarget;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  setTarget(id: string) {
    this.highlightTarget = id;
    this.emit();
  }

  clearTarget() {
    if (this.highlightTarget === null) return;
    this.highlightTarget = null;
    this.emit();
  }
}

export const pdfStore = new PdfStore();
