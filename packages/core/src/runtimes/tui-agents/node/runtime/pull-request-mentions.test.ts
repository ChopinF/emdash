import { describe, expect, it } from 'vitest';
import { PullRequestMentionTracker } from './pull-request-mentions';

const URL = 'https://github.com/ChopinF/emdash/pull/12';

function scan(...chunks: string[]): string[] {
  const tracker = new PullRequestMentionTracker();
  for (const chunk of chunks) tracker.push(chunk, 1);
  return tracker.list.map((mention) => mention.url);
}

describe('PullRequestMentionTracker', () => {
  it('finds a GitHub pull request', () => {
    const tracker = new PullRequestMentionTracker();
    expect(tracker.push(`Opened ${URL}\n`, 5)).toBe(true);
    expect(tracker.list).toEqual([
      {
        url: URL,
        provider: 'github',
        repository: 'ChopinF/emdash',
        number: 12,
        firstSeenAt: 5,
      },
    ]);
  });

  it('finds a GitLab merge request in a nested group', () => {
    const tracker = new PullRequestMentionTracker();
    tracker.push('https://gitlab.com/group/sub/repo/-/merge_requests/7 ', 1);
    expect(tracker.list).toMatchObject([
      { provider: 'gitlab', repository: 'group/sub/repo', number: 7 },
    ]);
  });

  it('drops the part of the URL after the number', () => {
    expect(scan(`${URL}/files?diff=split `)).toEqual([URL]);
  });

  it('joins a URL split across two chunks', () => {
    expect(scan('see https://github.com/ChopinF/em', 'dash/pull/12 now')).toEqual([URL]);
  });

  it('waits for the end of the number', () => {
    expect(scan('https://github.com/ChopinF/emdash/pull/1')).toEqual([]);
    expect(scan('https://github.com/ChopinF/emdash/pull/1', '2 ')).toEqual([URL]);
  });

  it('reads through colors inside a URL', () => {
    expect(scan(`\x1b[36mhttps://github.com/\x1b[1mChopinF/emdash/pull/12\x1b[0m\n`)).toEqual([
      URL,
    ]);
  });

  it('keeps a number apart from text placed by a cursor move', () => {
    expect(scan(`${URL}\x1b[2Cdone`)).toEqual([URL]);
  });

  it('reads the target of an OSC 8 hyperlink when the visible text wraps', () => {
    const link = `\x1b]8;;${URL}\x07https://github.com/Chopin\r\nF/emdash/pull/12\x1b]8;;\x07\n`;
    expect(scan(link)).toEqual([URL]);
  });

  it('reports a repeated mention once and keeps its first position', () => {
    const tracker = new PullRequestMentionTracker();
    const other = 'https://github.com/ChopinF/emdash/pull/13';
    tracker.push(`${URL} `, 1);
    tracker.push(`${other} `, 2);
    expect(tracker.push(`${URL.toUpperCase().replace('HTTPS', 'https')} `, 3)).toBe(false);
    expect(tracker.list.map((mention) => mention.firstSeenAt)).toEqual([1, 2]);
  });

  it('ignores issues, plain http and other pages', () => {
    expect(
      scan(
        'https://github.com/ChopinF/emdash/issues/12 ',
        'http://github.com/ChopinF/emdash/pull/12 ',
        'https://github.com/ChopinF/emdash/pulls '
      )
    ).toEqual([]);
  });

  it('keeps the newest 20', () => {
    const tracker = new PullRequestMentionTracker();
    for (let number = 1; number <= 25; number += 1) {
      tracker.push(`https://github.com/o/r/pull/${number} `, number);
    }
    expect(tracker.list).toHaveLength(20);
    expect(tracker.list[0]?.number).toBe(6);
  });

  it('keeps restored mentions when they appear again', () => {
    const tracker = new PullRequestMentionTracker();
    tracker.restore([
      { url: URL, provider: 'github', repository: 'ChopinF/emdash', number: 12, firstSeenAt: 1 },
    ]);
    expect(tracker.push(`${URL} `, 9)).toBe(false);
    expect(tracker.list[0]?.firstSeenAt).toBe(1);
  });
});
