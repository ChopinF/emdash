import { openFixture } from '@tooling/utils/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * 0047 adds `tasks.pending_delete_at`: the epoch-ms deadline of a scheduled (undoable) delete.
 * Additive and nullable — existing tasks are not scheduled for deletion.
 */
describe('0047 task pending delete deadline', () => {
  let fixture: Awaited<ReturnType<typeof openFixture>>;

  beforeEach(async () => {
    fixture = await openFixture('pre-0047');
  });

  afterEach(() => {
    fixture?.close();
  });

  it('adds a nullable column with no default and leaves existing tasks unscheduled', () => {
    const columns = fixture.sqlite.prepare(`PRAGMA table_info('tasks')`).all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
    }[];
    const column = columns.find((candidate) => candidate.name === 'pending_delete_at');
    expect(column).toBeDefined();
    expect(column?.type.toLowerCase()).toBe('integer');
    expect(column?.notnull).toBe(0);
    expect(column?.dflt_value).toBeNull();

    const total = fixture.sqlite.prepare(`SELECT COUNT(*) AS n FROM tasks`).get() as { n: number };
    expect(total.n).toBeGreaterThan(0);
    const scheduled = fixture.sqlite
      .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE pending_delete_at IS NOT NULL`)
      .get() as { n: number };
    expect(scheduled.n).toBe(0);
  });

  it('round-trips a deadline', () => {
    const row = fixture.sqlite.prepare(`SELECT id FROM tasks LIMIT 1`).get() as { id: string };
    fixture.sqlite
      .prepare(`UPDATE tasks SET pending_delete_at = ? WHERE id = ?`)
      .run(1_800_000_000_000, row.id);
    const stored = fixture.sqlite
      .prepare(`SELECT pending_delete_at AS deadline FROM tasks WHERE id = ?`)
      .get(row.id) as { deadline: number };
    expect(stored.deadline).toBe(1_800_000_000_000);
  });
});
