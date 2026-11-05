import { describe, expect, it } from 'vitest';
import { stepTaskEntry } from './step-task-entry';

const entries = ['a', 'b', 'c', 'd'].map((taskId) => ({ projectId: 'p', taskId }));
const at = (taskId: string) => ({ projectId: 'p', taskId });

describe('stepTaskEntry', () => {
  it('steps forward and backward', () => {
    expect(stepTaskEntry(entries, at('b'), 1)?.taskId).toBe('c');
    expect(stepTaskEntry(entries, at('b'), -1)?.taskId).toBe('a');
    expect(stepTaskEntry(entries, at('a'), 2)?.taskId).toBe('c');
  });

  it('clamps counts at the ends', () => {
    expect(stepTaskEntry(entries, at('b'), 10)?.taskId).toBe('d');
    expect(stepTaskEntry(entries, at('c'), -10)?.taskId).toBe('a');
  });

  it('returns undefined when the move would not change the task', () => {
    expect(stepTaskEntry(entries, at('d'), 1)).toBeUndefined();
    expect(stepTaskEntry(entries, at('a'), -3)).toBeUndefined();
    expect(stepTaskEntry(entries, at('b'), 0)).toBeUndefined();
  });

  it('returns undefined when the current task is not in the list', () => {
    expect(stepTaskEntry(entries, at('zzz'), 1)).toBeUndefined();
    expect(stepTaskEntry(entries, { projectId: 'other', taskId: 'a' }, 1)).toBeUndefined();
  });
});
