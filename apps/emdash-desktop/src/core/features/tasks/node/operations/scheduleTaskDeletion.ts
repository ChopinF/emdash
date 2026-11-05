import { and, eq, isNull } from 'drizzle-orm';
import type { AppDb } from '@core/services/app-db/node/db';
import { tasks } from '@core/services/app-db/node/schema';

/**
 * Records the deadline of a scheduled (undoable) delete. The caller archives the task right after,
 * which stops its agents but keeps the worktree and provider session ids, so restoring the task
 * (which clears the deadline) resumes the chat. `sweepPendingTaskDeletions` performs the real
 * deletion once the deadline passes.
 */
export async function setTaskPendingDeleteAt(
  db: AppDb,
  taskId: string,
  deleteAt: number
): Promise<boolean> {
  const updated = await db
    .update(tasks)
    .set({ pendingDeleteAt: deleteAt })
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .returning({ id: tasks.id });
  return updated.length > 0;
}
