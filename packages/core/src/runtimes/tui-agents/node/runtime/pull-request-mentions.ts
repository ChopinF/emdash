import type { TuiPullRequestMention } from '#runtimes/tui-agents/api';

const MAX_MENTIONS = 20;
/** Keeps enough of the previous output to finish a URL split across two chunks. */
const TAIL_LENGTH = 1024;

/**
 * The trailing `\D` must already be in the buffer, so `/pull/12` is not reported while `3` is
 * still on its way. Only the URL shape is matched: the hosts agents reach can be self-hosted.
 */
const PULL_REQUEST_URL =
  /https:\/\/(?<host>[a-z0-9.-]+)\/(?:(?<github>[\w.-]+\/[\w.-]+)\/pull\/|(?<gitlab>(?:[\w.-]+\/)+[\w.-]+)\/-\/merge_requests\/)(?<number>\d+)(?=\D)/gi;

/**
 * Reduces PTY output to plain text. An OSC 8 hyperlink keeps its target, which stays whole when
 * the visible text wraps. Colors vanish so they can't split a URL, and every other sequence
 * becomes a space so text placed by cursor moves doesn't run into a URL.
 */
function plainText(output: string): string {
  return output
    .replace(/\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g, ' $1 ')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, ' ')
    .replace(/\x1b\[[0-9;?]*m/g, '')
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ' ')
    .replace(/\r/g, ' ');
}

/** The pull requests a conversation's output has mentioned, oldest first. */
export class PullRequestMentionTracker {
  private tail = '';
  private mentions: readonly TuiPullRequestMention[] = [];

  get list(): readonly TuiPullRequestMention[] {
    return this.mentions;
  }

  restore(mentions: readonly TuiPullRequestMention[]): void {
    this.mentions = mentions.slice(-MAX_MENTIONS);
  }

  /** Scans a PTY chunk and returns true when it mentions a pull request for the first time. */
  push(chunk: string, now: number): boolean {
    const output = this.tail + chunk;
    this.tail = output.slice(-TAIL_LENGTH);

    let changed = false;
    for (const match of plainText(output).matchAll(PULL_REQUEST_URL)) {
      const mention = mentionFromMatch(match.groups ?? {}, now);
      if (!mention) continue;
      const url = mention.url.toLowerCase();
      if (this.mentions.some((known) => known.url.toLowerCase() === url)) continue;
      this.mentions = [...this.mentions, mention].slice(-MAX_MENTIONS);
      changed = true;
    }
    return changed;
  }
}

function mentionFromMatch(
  { host, github, gitlab, number }: Record<string, string | undefined>,
  firstSeenAt: number
): TuiPullRequestMention | null {
  const repository = github ?? gitlab;
  if (!host || !repository || !number) return null;
  const origin = `https://${host.toLowerCase()}/${repository}`;
  return {
    url: github ? `${origin}/pull/${number}` : `${origin}/-/merge_requests/${number}`,
    provider: github ? 'github' : 'gitlab',
    repository,
    number: Number(number),
    firstSeenAt,
  };
}
