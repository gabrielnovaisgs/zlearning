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

describe('openFileInPane — navigate in-place', () => {
  beforeEach(resetStore);

  it('substitui o path do tab ativo quando já tem conteúdo', () => {
    const { actions } = usePaneController.getState();

    actions.openFileInPane('notes/a.md', 'pane-1');
    const tabId = usePaneController.getState().panes[0].activeTabId!;

    actions.openFileInPane('notes/b.md', 'pane-1');

    const state = usePaneController.getState();
    const pane = state.panes[0];

    expect(pane.tabs).toHaveLength(1);
    expect(pane.tabs[0].id).toBe(tabId);
    expect(pane.tabs[0].path).toBe('notes/b.md');
    expect(pane.activeTabId).toBe(tabId);
  });

  it('não cria tab duplicada quando o path já está aberto no mesmo pane', () => {
    const { actions } = usePaneController.getState();

    actions.openFileInPane('notes/a.md', 'pane-1');
    actions.openFileInPane('notes/b.md', 'pane-1');
    actions.openFileInPane('notes/b.md', 'pane-1');

    const pane = usePaneController.getState().panes[0];
    expect(pane.tabs).toHaveLength(1);
    expect(pane.tabs[0].path).toBe('notes/b.md');
  });

  it('cria tab quando pane está vazia (sem tabs)', () => {
    const { actions } = usePaneController.getState();

    actions.openFileInPane('notes/a.md', 'pane-1');

    const pane = usePaneController.getState().panes[0];
    expect(pane.tabs).toHaveLength(1);
    expect(pane.tabs[0].path).toBe('notes/a.md');
  });

  it('mantém dedup cross-pane: ativa tab em outro pane se já existir lá', () => {
    const { actions } = usePaneController.getState();

    actions.openFileInPane('notes/a.md', 'pane-1');
    actions.splitPane('pane-1', 'right', false);
    const pane2Id = usePaneController.getState().panes[1].id;

    actions.openFileInPane('notes/b.md', pane2Id);
    actions.openFileInPane('notes/b.md', 'pane-1');

    const state = usePaneController.getState();
    expect(state.activePaneId).toBe(pane2Id);
    const pane1 = state.panes.find((p) => p.id === 'pane-1')!;
    expect(pane1.tabs.filter((t) => t.path === 'notes/b.md')).toHaveLength(0);
  });
});
