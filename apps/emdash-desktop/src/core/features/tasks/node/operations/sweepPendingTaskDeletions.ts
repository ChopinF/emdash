import { and, isNotNull, isNull, lte } from 'drizzle-orm';
import type { DeleteTaskOptions } from '@core/primitives/tasks/api/tasks';
import type { AppDb } from '@core/services/app-db/node/db';
import { tasks } from '@core/services/app-db/node/schema';

export type PendingTaskDeletionSweepDependencies = {
  readonly db: AppDb;
  readonly now: () => number;
  /** Real deletion needs the project's host (worktree removal is fail-fast). */
  readonly isProjectAttached: (projectId: string) => boolean;
  readonly deleteTask: (
    projectId: string,
    taskId: string,
    options: DeleteTaskOptions
  ) => Promise<void>;
  readonly deleteBranch: () => Promise<boolean>;
  readonly onTaskError?: (taskId: string, error: unknown) => void;
};

export type PendingTaskDeletionSweepResult = {
  readonly deleted: string[];
  readonly deferred: string[];
  readonly failed: string[];
};

/**
 * Deletes every archived task whose scheduled-delete deadline has passed. Tasks whose project host
 * is not attached yet (e.g. right after boot, or an offline SSH host) are deferred to a later run.
 */
export async function sweepPendingTaskDeletions(
  deps: PendingTaskDeletionSweepDependencies
): Promise<PendingTaskDeletionSweepResult> {
  const due = await deps.db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.pendingDeleteAt),
        lte(tasks.pendingDeleteAt, deps.now()),
        isNotNull(tasks.archivedAt),
        isNull(tasks.deletedAt)
      )
    );

  const result: PendingTaskDeletionSweepResult = { deleted: [], deferred: [], failed: [] };
  if (due.length === 0) return result;

  const deleteBranch = await deps.deleteBranch();
  for (const task of due) {
    if (!deps.isProjectAttached(task.projectId)) {
      result.deferred.push(task.id);
      continue;
    }
    try {
      await deps.deleteTask(task.projectId, task.id, {
        deleteWorktree: true,
        deleteBranch,
        deleteConversations: true,
      });
      result.deleted.push(task.id);
    } catch (error) {
      deps.onTaskError?.(task.id, error);
      result.failed.push(task.id);
    }
  }
  return result;
}
