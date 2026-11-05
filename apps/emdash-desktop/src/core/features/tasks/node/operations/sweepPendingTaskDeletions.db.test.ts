import { openFixture } from '@tooling/utils/db';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeleteTaskOptions } from '@core/primitives/tasks/api/tasks';
import { tasks } from '@core/services/app-db/node/schema';
import { restoreTask } from './restoreTask';
import { setTaskPendingDeleteAt } from './scheduleTaskDeletion';
import { sweepPendingTaskDeletions } from './sweepPendingTaskDeletions';

const NOW = 1_800_000_000_000;

describe('scheduled task deletion', () => {
  let fixture: Awaited<ReturnType<typeof openFixture>>;

  beforeEach(async () => {
    fixture = await openFixture('empty');
    fixture.sqlite
      .prepare(
        `INSERT INTO projects (id, name, created_at, updated_at)
         VALUES ('project-1', 'Project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                ('project-2', 'Offline', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run();
  });

  afterEach(() => {
    fixture.close();
  });

  async function insertTask(
    id: string,
    values: { projectId?: string; archived?: boolean; pendingDeleteAt?: number | null } = {}
  ) {
    await fixture.db.insert(tasks).values({
      id,
      projectId: values.projectId ?? 'project-1',
      name: id,
      status: 'in_progress',
      archivedAt: values.archived ? '2026-11-02 10:00:00' : null,
      pendingDeleteAt: values.pendingDeleteAt ?? null,
    });
  }

  async function pendingDeleteAtOf(id: string) {
    const [row] = await fixture.db
      .select({ pendingDeleteAt: tasks.pendingDeleteAt, archivedAt: tasks.archivedAt })
      .from(tasks)
      .where(eq(tasks.id, id));
    return row;
  }

  function sweep(attachedProjects = new Set(['project-1'])) {
    const deleteTask = vi.fn<(p: string, t: string, o: DeleteTaskOptions) => Promise<void>>(
      async () => undefined
    );
    const run = sweepPendingTaskDeletions({
      db: fixture.db,
      now: () => NOW,
      isProjectAttached: (projectId) => attachedProjects.has(projectId),
      deleteTask,
      deleteBranch: async () => true,
    });
    return { deleteTask, run };
  }

  it('records the deadline and restore clears it', async () => {
    await insertTask('task-1', { archived: true });
    expect(await setTaskPendingDeleteAt(fixture.db, 'task-1', NOW + 1000)).toBe(true);
    expect((await pendingDeleteAtOf('task-1'))?.pendingDeleteAt).toBe(NOW + 1000);

    await restoreTask(fixture.db, 'task-1');
    expect(await pendingDeleteAtOf('task-1')).toEqual({ pendingDeleteAt: null, archivedAt: null });
  });

  it('does not schedule a missing task', async () => {
    expect(await setTaskPendingDeleteAt(fixture.db, 'nope', NOW)).toBe(false);
  });

  it('deletes only archived tasks whose deadline has passed', async () => {
    await insertTask('due', { archived: true, pendingDeleteAt: NOW - 1 });
    await insertTask('exactly-due', { archived: true, pendingDeleteAt: NOW });
    await insertTask('future', { archived: true, pendingDeleteAt: NOW + 60_000 });
    await insertTask('restored', { archived: false, pendingDeleteAt: NOW - 1 });
    await insertTask('plain-archived', { archived: true });
    await insertTask('active');

    const { deleteTask, run } = sweep();
    const result = await run;

    expect(result.deleted.sort()).toEqual(['due', 'exactly-due']);
    expect(deleteTask).toHaveBeenCalledTimes(2);
    expect(deleteTask).toHaveBeenCalledWith('project-1', 'due', {
      deleteWorktree: true,
      deleteBranch: true,
      deleteConversations: true,
    });
  });

  it('defers tasks whose project host is not attached', async () => {
    await insertTask('offline', {
      projectId: 'project-2',
      archived: true,
      pendingDeleteAt: NOW - 1,
    });
    const { deleteTask, run } = sweep();
    const result = await run;
    expect(result.deferred).toEqual(['offline']);
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it('reports failures and keeps going', async () => {
    await insertTask('a', { archived: true, pendingDeleteAt: NOW - 2 });
    await insertTask('b', { archived: true, pendingDeleteAt: NOW - 1 });
    const onTaskError = vi.fn();
    const result = await sweepPendingTaskDeletions({
      db: fixture.db,
      now: () => NOW,
      isProjectAttached: () => true,
      deleteTask: async (_projectId, taskId) => {
        if (taskId === 'a') throw new Error('worktree locked');
      },
      deleteBranch: async () => false,
      onTaskError,
    });
    expect(result.failed).toEqual(['a']);
    expect(result.deleted).toEqual(['b']);
    expect(onTaskError).toHaveBeenCalledWith('a', expect.any(Error));
  });
});
