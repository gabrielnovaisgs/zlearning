import { PanelLeftClose, PanelLeftOpen, MessageSquare, Sun, Moon, Settings } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/ui/tooltip';
import { useSidebar } from '@shared/ui/sidebar';
import { GLOBAL_CONFIG } from '@app/config';
import { nanoid } from 'nanoid';
import { usePaneController } from '@features/panes/pane-controller.store';
import { useThemeStore } from '@features/theme/theme.store';
import { useConfigStore } from '@features/config/config.store';

interface ActivityBarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ActivityBarButton({ action }: { action: ActivityBarAction }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={action.onClick}
          className={
            action.active
              ? 'size-9 text-fg bg-accent/10 rounded-lg'
              : 'size-9 text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg'
          }
          aria-label={action.label}
        >
          {action.icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {action.label}
      </TooltipContent>
    </Tooltip>
  );
}

const THEME_COLORS: Record<string, string> = {
  indigo: '#7B93F5',
  amber:  '#D4A853',
};

const THEME_LABELS: Record<string, string> = {
  indigo: 'Índigo',
  amber:  'Âmbar',
};

export function ActivityBar() {
  const { toggleSidebar, open } = useSidebar();
  const mode    = useThemeStore((s) => s.mode);
  const theme   = useThemeStore((s) => s.theme);
  const actions = useThemeStore((s) => s.actions);

  const topActions: ActivityBarAction[] = [
    {
      id: 'toggle-explorer',
      icon: open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />,
      label: open ? 'Fechar explorador' : 'Abrir explorador',
      onClick: toggleSidebar,
      active: open,
    },
  ];

  const bottomActions: ActivityBarAction[] = [
    {
      id: 'open-chat',
      icon: <MessageSquare className="size-4" />,
      label: 'Chat',
      onClick: () => {
        const tempId = `new-${nanoid()}`;
        usePaneController.getState().actions.openFileInPane(`chat://${tempId}`);
      },
    },
  ];

  return (
    <div className="flex h-full w-11 shrink-0 flex-col items-center border-r border-border bg-surface py-2 gap-0.5 z-20">
      <div
        className="flex w-full items-center justify-center shrink-0"
        style={{ height: GLOBAL_CONFIG.headerHeight }}
      >
        <ActivityBarButton action={topActions[0]} />
      </div>
      <div className="flex flex-col items-center gap-1 py-2">
        {topActions.slice(1).map((action) => (
          <ActivityBarButton key={action.id} action={action} />
        ))}
      </div>

      {/* Ações na parte inferior */}
      <div className="mt-auto flex flex-col items-center gap-1 py-2">
        {bottomActions.map((action) => (
          <ActivityBarButton key={action.id} action={action} />
        ))}
        <ActivityBarButton
          action={{
            id: 'open-config',
            icon: <Settings className="size-4" />,
            label: 'Configurações',
            onClick: () => useConfigStore.getState().actions.open(),
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={actions.cycleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 transition-colors"
              aria-label="Trocar tema"
            >
              <span
                className="block w-3.5 h-3.5 rounded-full ring-2 ring-border"
                style={{ backgroundColor: THEME_COLORS[theme] }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Tema: {THEME_LABELS[theme]}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={actions.toggleMode}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
            >
              {mode === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
