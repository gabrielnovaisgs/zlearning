export interface Shortcut {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  key: string;
}

export interface Command {
  id: string;
  name: string;
  shortcut: Shortcut;
  execute: () => void;
}

class CommandRegistry {
  private commands = new Map<string, Command>();
  private cleanup: (() => void) | null = null;

  register(command: Command) {
    this.commands.set(command.id, command);
  }

  getAll(): Command[] {
    return [...this.commands.values()];
  }

  execute(id: string) {
    this.commands.get(id)?.execute();
  }

  init() {
    const handler = (e: KeyboardEvent) => {
      for (const cmd of this.commands.values()) {
        const s = cmd.shortcut;
        const ctrlOrMeta = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shift = s.shift ? e.shiftKey : !e.shiftKey;
        if (ctrlOrMeta && shift && e.key.toLowerCase() === s.key.toLowerCase()) {
          e.preventDefault();
          cmd.execute();
          return;
        }
      }
    };
    document.addEventListener("keydown", handler);
    this.cleanup = () => document.removeEventListener("keydown", handler);
  }

  destroy() {
    this.cleanup?.();
    this.cleanup = null;
  }
}

export const registry = new CommandRegistry();
