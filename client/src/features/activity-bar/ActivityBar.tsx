import { PanelLeftClose, PanelLeftOpen, MessageSquare } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/ui/tooltip';
import { useSidebar } from '@shared/ui/sidebar';
import { GLOBAL_CONFIG } from '@app/config';
import { nanoid } from 'nanoid';
import { usePaneController } from '@features/panes/pane-controller.store';

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
              ? 'size-9 text-text-primary'
              : 'size-9 text-text-muted hover:bg-bg-hover hover:text-text-primary'
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

export function ActivityBar() {
  const { toggleSidebar, open } = useSidebar();

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
    <div className="flex h-full w-12 shrink-0 flex-col items-center border-r border-border bg-bg-secondary z-99999">
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
      </div>
    </div>
  );
}
