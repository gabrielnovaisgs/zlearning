// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { usePaneController } from './pane-controller.store';

function resetStore() {
  usePaneController.setState({
    activeFile: null,
    activePaneId: 'pane-1',
    panes: [{ id: 'pane-1', tabs: [], activeTabId: null, flexRatio: 1 }],
  });
}

describe('pane-controller cross-pane dedup', () => {
  beforeEach(resetStore);

  it('foca tab existente em outro pane em vez de duplicar', () => {
    const { actions } = usePaneController.getState();

    // Abre arquivo no pane-1
    actions.openFileInPane('notes/foo.md', 'pane-1');
    // Cria pane-2
    actions.splitPane('pane-1', 'right', false);
    const pane2Id = usePaneController.getState().panes[1].id;

    // Tenta abrir o mesmo arquivo no pane-2
    actions.openFileInPane('notes/foo.md', pane2Id);

    const state = usePaneController.getState();
    // Deve ter focado pane-1 (onde o arquivo já estava)
    expect(state.activePaneId).toBe('pane-1');
    // Pane-2 não deve ter nova tab com notes/foo.md
    const pane2 = state.panes.find((p) => p.id === pane2Id)!;
    expect(pane2.tabs.filter((t) => t.path === 'notes/foo.md')).toHaveLength(0);
  });

  it('chat:// path não altera a URL do browser', () => {
    const { actions } = usePaneController.getState();
    const initialUrl = location.pathname;
    actions.openFileInPane('chat://abc123', 'pane-1');
    expect(location.pathname).toBe(initialUrl);
  });
});
