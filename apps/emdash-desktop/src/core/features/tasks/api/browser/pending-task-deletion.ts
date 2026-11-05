import { toast } from '@emdash/ui/react/primitives';
import {
  getRegisteredTaskData,
  getTaskManagerStore,
} from '@core/features/tasks/api/browser/task-state/task-selectors';
import { taskViewDef } from '@core/features/tasks/contributions/views';
import { getNavigation } from '@core/primitives/navigation/browser/navigation-selectors';
import { PENDING_DELETE_DELAY_MS } from '@core/primitives/tasks/api/tasks';

/** Restores a task scheduled for deletion (cancelling the delete) and opens it; its chat resumes. */
export async function cancelScheduledTaskDelete(projectId: string, taskId: string): Promise<void> {
  const manager = getTaskManagerStore(projectId);
  if (!manager) return;
  await manager.restoreTask(taskId);
  getNavigation().navigate(taskViewDef({ projectId, taskId }));
}

/**
 * Mainmod `d d`: stops the task now and deletes it (worktree, branch, chats) after
 * `PENDING_DELETE_DELAY_MS`, with an Undo toast.
 */
export async function scheduleTaskDelete(projectId: string, taskId: string): Promise<void> {
  const manager = getTaskManagerStore(projectId);
  if (!manager) return;
  const name = getRegisteredTaskData(projectId, taskId)?.name || 'task';
  await manager.scheduleDeleteTask(taskId, Date.now() + PENDING_DELETE_DELAY_MS);
  toast(`Deleting “${name}” in 1 hour`, {
    description: 'Agents stopped. Undo here, with Left ⌘ U, or from “Deleting soon”.',
    duration: 8000,
    action: {
      label: 'Undo',
      onClick: () => {
        void cancelScheduledTaskDelete(projectId, taskId).catch(() =>
          toast.error(`Could not restore “${name}”`)
        );
      },
    },
  });
}
