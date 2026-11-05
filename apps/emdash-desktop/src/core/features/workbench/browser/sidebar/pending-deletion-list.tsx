import { MicroLabel, toast } from '@emdash/ui/react/primitives';
import { Undo2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { cancelScheduledTaskDelete } from '@core/features/tasks/api/browser/pending-task-deletion';
import { getSidebarStore } from '@core/features/workbench/contributions/browser/app-stores';
import { SidebarGroup, SidebarMenu, SidebarMenuRow } from './sidebar-primitives';

const TICK_MS = 30_000;

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'now';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs]);
  return now;
}

/** Tasks scheduled for deletion via mainmod `d d`, with a countdown and Undo. */
export const SidebarPendingDeletionList = observer(function SidebarPendingDeletionList() {
  const entries = getSidebarStore().pendingDeletionEntries;
  const now = useNow(TICK_MS);
  if (entries.length === 0) return null;

  return (
    <SidebarGroup className="flex shrink-0 flex-col border-t border-border">
      <div className="flex h-[36px] items-center justify-between pr-2.5 pl-5">
        <MicroLabel className="font-medium text-foreground-tertiary-passive">
          Deleting soon
        </MicroLabel>
      </div>
      <SidebarMenu className="px-3 pb-2">
        {entries.map(({ projectId, taskId, name, deleteAt }) => (
          <SidebarMenuRow
            key={`${projectId}:${taskId}`}
            className="group/row flex h-8 items-center justify-between gap-1 px-1 py-1.5 pl-2"
          >
            <span className="min-w-0 truncate text-left text-foreground/50 line-through decoration-foreground/30">
              {name}
            </span>
            <span className="ml-2 flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-[11px] text-foreground/45 tabular-nums">
                {formatRemaining(deleteAt - now)}
              </span>
              <button
                type="button"
                aria-label={`Undo delete of ${name}`}
                title="Undo delete (Left ⌘ U)"
                className="flex size-5 cursor-pointer items-center justify-center rounded text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                onClick={() => {
                  void cancelScheduledTaskDelete(projectId, taskId).catch(() =>
                    toast.error(`Could not restore “${name}”`)
                  );
                }}
              >
                <Undo2 className="size-3.5" />
              </button>
            </span>
          </SidebarMenuRow>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
