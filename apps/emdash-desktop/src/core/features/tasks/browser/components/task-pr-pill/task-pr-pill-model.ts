import type { TuiPullRequestMention } from '@emdash/core/runtimes/tui-agents/api';
import type { PullRequest } from '@emdash/plugins/pull-requests/schemas';
import { selectCurrentPr } from '@core/services/pull-requests/api';

export type TaskPrPillModel = {
  /** Shown on the pill and opened by a click. */
  primary: { kind: 'own'; pr: PullRequest } | { kind: 'mention'; mention: TuiPullRequestMention };
  /** The task's own pull requests, current first. */
  own: readonly PullRequest[];
  /** Pull requests only mentioned in conversations, latest first. */
  mentions: readonly TuiPullRequestMention[];
  total: number;
};

function urlKey(url: string): string {
  return url.toLowerCase();
}

/**
 * The task's own pull request wins the pill: a mention may only be a reference, so it shouldn't
 * replace the one the task opened. Otherwise the pill shows the latest mention.
 */
export function buildTaskPrPillModel(
  pullRequests: readonly PullRequest[],
  mentioned: readonly TuiPullRequestMention[]
): TaskPrPillModel | null {
  const current = selectCurrentPr(pullRequests);
  const own = [...pullRequests].sort((a, b) => {
    if (a === current) return -1;
    if (b === current) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const ownUrls = new Set(own.map((pr) => urlKey(pr.url)));
  const latest = new Map<string, TuiPullRequestMention>();
  for (const mention of mentioned) {
    const key = urlKey(mention.url);
    if (ownUrls.has(key)) continue;
    const known = latest.get(key);
    if (!known || mention.firstSeenAt > known.firstSeenAt) latest.set(key, mention);
  }
  const mentions = [...latest.values()].sort((a, b) => b.firstSeenAt - a.firstSeenAt);

  const firstOwn = own[0];
  const firstMention = mentions[0];
  const primary = firstOwn
    ? ({ kind: 'own', pr: firstOwn } as const)
    : firstMention
      ? ({ kind: 'mention', mention: firstMention } as const)
      : null;
  if (!primary) return null;
  return { primary, own, mentions, total: own.length + mentions.length };
}
