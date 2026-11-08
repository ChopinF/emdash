import type { TuiPullRequestMention } from '@emdash/core/runtimes/tui-agents/api';
import type { PullRequest } from '@emdash/plugins/pull-requests/schemas';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskStore } from '@core/features/tasks/api/browser/stores/task-store';
import { TaskPrPill } from './task-pr-pill';

const state = vi.hoisted(() => ({
  pullRequests: [] as unknown[],
  mentions: [] as unknown[],
}));
const openExternal = vi.hoisted(() => vi.fn());

vi.mock('@core/features/source-control/api/browser/stores/task-source-control-selectors', () => ({
  getTaskPrAssociationStore: () => ({ pullRequests: state.pullRequests }),
}));
vi.mock('@core/features/workbench/api/browser/task-composition-context', () => ({
  useConversations: () => ({ pullRequestMentions: state.mentions }),
}));
vi.mock('@core/primitives/desktop-host/browser/host-client', () => ({ openExternal }));

const ownPr = {
  url: 'https://github.com/o/r/pull/42',
  identifier: '#42',
  title: 'Fix login',
  status: 'open',
  isDraft: false,
  provider: 'github',
  createdAt: '2026-01-01',
} as unknown as PullRequest;

const mention: TuiPullRequestMention = {
  url: 'https://github.com/o/site/pull/18',
  provider: 'github',
  repository: 'o/site',
  number: 18,
  firstSeenAt: 5,
};

describe('TaskPrPill', () => {
  let host: HTMLDivElement;
  let root: Root;

  const renderPill = () => act(async () => root.render(<TaskPrPill taskStore={{} as TaskStore} />));
  const pill = () => host.querySelector('button')!;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    state.pullRequests = [];
    state.mentions = [];
    openExternal.mockClear();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it('renders nothing without pull requests', async () => {
    await renderPill();
    expect(host.childElementCount).toBe(0);
  });

  it('opens the only pull request on click', async () => {
    state.mentions = [mention];
    await renderPill();
    await act(async () => pill().click());
    expect(openExternal).toHaveBeenCalledWith(mention.url);
  });

  it('opens the task pull request on click without opening the list', async () => {
    state.pullRequests = [ownPr];
    state.mentions = [mention];
    await renderPill();
    expect(pill().textContent).toBe('#42+1');

    await act(async () => pill().click());

    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledWith(ownPr.url);
    expect(document.body.textContent).not.toContain('Mentioned');
  });

  it('lists every pull request on hover and opens the chosen one', async () => {
    state.pullRequests = [ownPr];
    state.mentions = [mention];
    await renderPill();

    await act(async () => {
      pill().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      pill().dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      pill().dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      pill().dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    await vi.waitFor(() => expect(document.body.textContent).toContain('Mentioned'));
    expect(document.body.textContent).toContain('This task');
    const row = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('o/site')
    )!;
    await act(async () => row.click());
    expect(openExternal).toHaveBeenCalledWith(mention.url);
  });
});
