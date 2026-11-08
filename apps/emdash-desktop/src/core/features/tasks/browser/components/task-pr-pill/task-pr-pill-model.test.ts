import type { TuiPullRequestMention } from '@emdash/core/runtimes/tui-agents/api';
import type { PullRequest } from '@emdash/plugins/pull-requests/schemas';
import { describe, expect, it } from 'vitest';
import { buildTaskPrPillModel } from './task-pr-pill-model';

function pr(number: number, status: string, createdAt: string): PullRequest {
  return {
    url: `https://github.com/o/r/pull/${number}`,
    status,
    createdAt,
  } as unknown as PullRequest;
}

function mention(number: number, firstSeenAt: number, repo = 'o/other'): TuiPullRequestMention {
  return {
    url: `https://github.com/${repo}/pull/${number}`,
    provider: 'github',
    repository: repo,
    number,
    firstSeenAt,
  };
}

describe('buildTaskPrPillModel', () => {
  it('returns nothing without pull requests', () => {
    expect(buildTaskPrPillModel([], [])).toBeNull();
  });

  it('shows the latest mention when the task has no pull request', () => {
    const model = buildTaskPrPillModel([], [mention(1, 10), mention(2, 20)]);
    expect(model?.primary).toEqual({ kind: 'mention', mention: mention(2, 20) });
    expect(model?.mentions.map((item) => item.number)).toEqual([2, 1]);
  });

  it('keeps the task pull request on the pill over a newer mention', () => {
    const own = pr(1, 'open', '2026-01-01');
    const model = buildTaskPrPillModel([own], [mention(2, 99)]);
    expect(model?.primary).toEqual({ kind: 'own', pr: own });
    expect(model?.total).toBe(2);
  });

  it('puts the open pull request ahead of newer closed ones', () => {
    const open = pr(1, 'open', '2026-01-01');
    const merged = pr(2, 'merged', '2026-02-01');
    expect(buildTaskPrPillModel([merged, open], [])?.own).toEqual([open, merged]);
  });

  it('leaves out mentions of the task pull request', () => {
    const own = pr(1, 'open', '2026-01-01');
    const model = buildTaskPrPillModel([own], [mention(1, 5, 'o/r')]);
    expect(model?.mentions).toEqual([]);
    expect(model?.total).toBe(1);
  });

  it('merges the same mention from two conversations', () => {
    const model = buildTaskPrPillModel([], [mention(1, 5), mention(1, 9), mention(2, 7)]);
    expect(model?.mentions.map((item) => [item.number, item.firstSeenAt])).toEqual([
      [1, 9],
      [2, 7],
    ]);
  });
});
