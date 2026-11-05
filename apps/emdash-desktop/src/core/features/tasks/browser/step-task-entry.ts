type TaskEntry = { readonly projectId: string; readonly taskId: string };

/**
 * Moves `delta` steps from `current` through `entries`, clamping at both ends (like vim's `10j`).
 * Returns undefined when `current` is not in the list or the move would not change the task.
 */
export function stepTaskEntry<T extends TaskEntry>(
  entries: readonly T[],
  current: TaskEntry,
  delta: number
): T | undefined {
  const index = entries.findIndex(
    (entry) => entry.projectId === current.projectId && entry.taskId === current.taskId
  );
  if (index === -1 || delta === 0) return undefined;
  const target = Math.min(Math.max(index + delta, 0), entries.length - 1);
  return target === index ? undefined : entries[target];
}
