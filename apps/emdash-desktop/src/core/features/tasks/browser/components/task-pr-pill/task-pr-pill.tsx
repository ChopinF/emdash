import type { TuiPullRequestMention } from '@emdash/core/runtimes/tui-agents/api';
import type { PullRequest } from '@emdash/plugins/pull-requests/schemas';
import { MicroLabel, Popover } from '@emdash/ui/react/primitives';
import { GitPullRequest } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { getTaskPrAssociationStore } from '@core/features/source-control/api/browser/stores/task-source-control-selectors';
import type { TaskStore } from '@core/features/tasks/api/browser/stores/task-store';
import { useConversations } from '@core/features/workbench/api/browser/task-composition-context';
import { openExternal } from '@core/primitives/desktop-host/browser/host-client';
import { getPrNumber } from '@core/services/pull-requests/api';
import { StatusIcon } from '@root/src/core/services/pull-requests/browser/components/pr-status-icon';
import { buildTaskPrPillModel, type TaskPrPillModel } from './task-pr-pill-model';

const ROW_CLASS =
  'flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-foreground-muted hover:bg-background-2 hover:text-foreground';

function prLabel(pr: PullRequest): string {
  return `${pr.provider === 'gitlab' ? '!' : '#'}${getPrNumber(pr) ?? 0}`;
}

function mentionLabel(mention: TuiPullRequestMention): string {
  return `${mention.provider === 'gitlab' ? '!' : '#'}${mention.number}`;
}

function primaryUrl({ primary }: TaskPrPillModel): string {
  return primary.kind === 'own' ? primary.pr.url : primary.mention.url;
}

function PillContent({ model }: { model: TaskPrPillModel }) {
  const { primary, total } = model;
  return (
    <>
      {primary.kind === 'own' ? (
        <StatusIcon className="size-3" pr={primary.pr} disableTooltip />
      ) : (
        <GitPullRequest className="size-3" />
      )}
      <span className="font-sans">
        {primary.kind === 'own' ? prLabel(primary.pr) : mentionLabel(primary.mention)}
      </span>
      {total > 1 ? <span className="text-foreground-passive">+{total - 1}</span> : null}
    </>
  );
}

function PrList({ model }: { model: TaskPrPillModel }) {
  return (
    <div className="flex flex-col gap-2">
      {model.own.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          <MicroLabel className="px-1.5 text-foreground-passive">This task</MicroLabel>
          {model.own.map((pr) => (
            <button
              key={pr.url}
              type="button"
              className={ROW_CLASS}
              onClick={() => void openExternal(pr.url)}
            >
              <StatusIcon className="size-3 shrink-0" pr={pr} disableTooltip />
              <span className="shrink-0 font-sans">{prLabel(pr)}</span>
              <span className="truncate">{pr.title}</span>
            </button>
          ))}
        </div>
      ) : null}
      {model.mentions.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          <MicroLabel className="px-1.5 text-foreground-passive">Mentioned</MicroLabel>
          {model.mentions.map((mention) => (
            <button
              key={mention.url}
              type="button"
              className={ROW_CLASS}
              onClick={() => void openExternal(mention.url)}
            >
              <GitPullRequest className="size-3 shrink-0" />
              <span className="shrink-0 font-sans">{mentionLabel(mention)}</span>
              <span className="truncate">{mention.repository}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Opens the task's latest pull request; hovering lists the others it knows about. */
export const TaskPrPill = observer(function TaskPrPill({ taskStore }: { taskStore: TaskStore }) {
  const conversations = useConversations();
  const model = buildTaskPrPillModel(
    getTaskPrAssociationStore(taskStore).pullRequests,
    conversations.pullRequestMentions
  );
  if (!model) return null;

  const className =
    'hover:bg-muted/30 ml-1 flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground-muted';
  const open = () => void openExternal(primaryUrl(model));

  if (model.total === 1) {
    return (
      <button type="button" className={className} onClick={open} aria-label="Open pull request">
        <PillContent model={model} />
      </button>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        className={className}
        aria-label={`Open pull request, ${model.total} in this task`}
        onClick={(event) => {
          event.preventBaseUIHandler();
          open();
        }}
      >
        <PillContent model={model} />
      </Popover.Trigger>
      <Popover.Content align="start" className="w-72 p-1.5">
        <PrList model={model} />
      </Popover.Content>
    </Popover.Root>
  );
});
