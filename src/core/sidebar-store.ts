type Listener = () => void;

class SidebarStore {
  private expandedDirs = new Set<string>();
  private listeners = new Set<Listener>();

  getState(): Set<string> {
    return this.expandedDirs;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  toggle(path: string) {
    const next = new Set(this.expandedDirs);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    this.expandedDirs = next;
    this.emit();
  }

  expand(path: string) {
    if (this.expandedDirs.has(path)) return;
    this.expandedDirs = new Set(this.expandedDirs);
    this.expandedDirs.add(path);
    this.emit();
  }

  isExpanded(path: string): boolean {
    return this.expandedDirs.has(path);
  }

  expandMany(paths: string[]) {
    const next = new Set(this.expandedDirs);
    let changed = false;
    for (const p of paths) {
      if (!next.has(p)) {
        next.add(p);
        changed = true;
      }
    }
    if (changed) {
      this.expandedDirs = next;
      this.emit();
    }
  }
}

export const sidebarStore = new SidebarStore();
