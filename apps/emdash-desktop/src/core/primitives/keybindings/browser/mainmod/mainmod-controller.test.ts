import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { MainmodKey } from '@core/primitives/app-settings/api/app-settings';
import { defineCommand } from '@core/primitives/commands/api/define-command';
import {
  MainmodController,
  type MainmodBinding,
  type MainmodKeyEvent,
  type MainmodTimers,
} from './mainmod-controller';
import { MainmodState } from './mainmod-state';

const nextCommand = defineCommand({
  id: 'test.next',
  title: 'Next',
  category: 'Test',
  input: z.object({ count: z.number() }).optional(),
});
const newCommand = defineCommand({ id: 'test.new', title: 'New', category: 'Test' });
const deleteCommand = defineCommand({ id: 'test.delete', title: 'Delete', category: 'Test' });

const KEYMAP: readonly MainmodBinding[] = [
  { keys: ['KeyJ'], label: 'j', command: nextCommand, acceptsCount: true, repeat: true },
  { keys: ['KeyN'], label: 'n', command: newCommand },
  { keys: ['KeyD', 'KeyD'], label: 'd d', command: deleteCommand },
];

type FakeEvent = MainmodKeyEvent & {
  preventDefault: ReturnType<typeof vi.fn>;
  stopImmediatePropagation: ReturnType<typeof vi.fn>;
};

function key(
  code: string,
  options: {
    type?: 'keydown' | 'keyup';
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    repeat?: boolean;
  } = {}
): FakeEvent {
  return {
    type: options.type ?? 'keydown',
    code,
    metaKey: options.metaKey ?? true,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    repeat: options.repeat ?? false,
    isComposing: false,
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  } as FakeEvent;
}

function setup(mainmodKey: MainmodKey = 'leftMeta') {
  const state = new MainmodState();
  const runBinding = vi.fn<(binding: MainmodBinding, count: number | undefined) => void>();
  const scheduled: Array<() => void> = [];
  const timers: MainmodTimers = {
    set: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    clear: vi.fn(),
  };
  let currentKey = mainmodKey;
  const controller = new MainmodController({
    keymap: () => KEYMAP,
    runBinding,
    mainmodKey: () => currentKey,
    state,
    timers,
  });
  return {
    state,
    runBinding,
    controller,
    scheduled,
    setKey: (next: MainmodKey) => {
      currentKey = next;
    },
    holdMainmod: () => controller.handleKeyDown(key('MetaLeft')),
  };
}

describe('MainmodController', () => {
  it('activates on Left ⌘ and runs single-key bindings', () => {
    const { controller, state, runBinding, holdMainmod } = setup();
    holdMainmod();
    expect(state.held).toBe(true);

    const event = key('KeyN');
    expect(controller.handleKeyDown(event)).toBe(true);
    expect(runBinding).toHaveBeenCalledWith(KEYMAP[1], undefined);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
  });

  it('ignores Right ⌘', () => {
    const { controller, state, runBinding } = setup();
    controller.handleKeyDown(key('MetaRight'));
    expect(state.held).toBe(false);
    const event = key('KeyN');
    expect(controller.handleKeyDown(event)).toBe(false);
    expect(runBinding).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('deactivates while Right ⌘ is also held', () => {
    const { controller, state, runBinding, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('MetaRight'));
    expect(state.held).toBe(false);
    expect(controller.handleKeyDown(key('KeyN'))).toBe(false);
    expect(runBinding).not.toHaveBeenCalled();
  });

  it('passes a typed count to bindings that accept it', () => {
    const { controller, state, runBinding, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('Digit1'));
    controller.handleKeyDown(key('Digit2'));
    expect(state.count).toBe('12');
    controller.handleKeyDown(key('KeyJ'));
    expect(runBinding).toHaveBeenCalledWith(KEYMAP[0], 12);
    expect(state.count).toBe('');
  });

  it('does not treat a leading 0 as a count', () => {
    const { controller, state, holdMainmod } = setup();
    holdMainmod();
    expect(controller.handleKeyDown(key('Digit0'))).toBe(false);
    expect(state.count).toBe('');
  });

  it('runs two-key sequences and cancels on a mismatched second key', () => {
    const { controller, state, runBinding, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('KeyD'));
    expect(state.pending).toBe('KeyD');
    controller.handleKeyDown(key('KeyD'));
    expect(runBinding).toHaveBeenCalledWith(KEYMAP[2], undefined);

    runBinding.mockClear();
    controller.handleKeyDown(key('KeyD'));
    expect(controller.handleKeyDown(key('KeyX'))).toBe(true);
    expect(runBinding).not.toHaveBeenCalled();
    expect(state.pending).toBeNull();
  });

  it('passes unbound keys through when nothing is pending', () => {
    const { controller, holdMainmod } = setup();
    holdMainmod();
    const event = key('Enter');
    expect(controller.handleKeyDown(event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
  });

  it('claims an unbound key that interrupts a count', () => {
    const { controller, state, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('Digit3'));
    expect(controller.handleKeyDown(key('KeyQ'))).toBe(true);
    expect(state.count).toBe('');
  });

  it('Escape clears partial input', () => {
    const { controller, state, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('Digit3'));
    expect(controller.handleKeyDown(key('Escape'))).toBe(true);
    expect(state.count).toBe('');
    expect(controller.handleKeyDown(key('Escape'))).toBe(false);
  });

  it('only repeats bindings marked repeat', () => {
    const { controller, runBinding, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('KeyJ', { repeat: true }));
    controller.handleKeyDown(key('KeyN', { repeat: true }));
    expect(runBinding).toHaveBeenCalledTimes(1);
    expect(runBinding).toHaveBeenCalledWith(KEYMAP[0], undefined);
  });

  it('releases on Left ⌘ keyup and on reset', () => {
    const { controller, state, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('Digit3'));
    controller.handleKeyUp(key('MetaLeft', { type: 'keyup', metaKey: false }));
    expect(state.held).toBe(false);
    expect(state.count).toBe('');

    holdMainmod();
    controller.reset();
    expect(state.held).toBe(false);
    expect(controller.handleKeyDown(key('KeyN'))).toBe(false);
  });

  it('resyncs when a key arrives without metaKey (missed Left ⌘ keyup)', () => {
    const { controller, state, runBinding, holdMainmod } = setup();
    holdMainmod();
    expect(controller.handleKeyDown(key('KeyN', { metaKey: false }))).toBe(false);
    expect(state.held).toBe(false);
    expect(runBinding).not.toHaveBeenCalled();
  });

  it('does nothing when mainmod is off', () => {
    const { controller, state, runBinding, holdMainmod } = setup('off');
    holdMainmod();
    expect(state.held).toBe(false);
    expect(controller.handleKeyDown(key('KeyN'))).toBe(false);
    expect(runBinding).not.toHaveBeenCalled();
  });

  it('shows the overlay after the hold delay unless a key was pressed', () => {
    const { controller, state, scheduled, holdMainmod } = setup();
    holdMainmod();
    scheduled[0]?.();
    expect(state.overlayVisible).toBe(true);

    controller.reset();
    holdMainmod();
    controller.handleKeyDown(key('KeyN'));
    controller.handleKeyUp(key('MetaLeft', { type: 'keyup', metaKey: false }));
    scheduled[1]?.();
    expect(state.overlayVisible).toBe(false);
  });

  it('claims the keyup of a claimed key', () => {
    const { controller, holdMainmod } = setup();
    holdMainmod();
    controller.handleKeyDown(key('KeyN'));
    const up = key('KeyN', { type: 'keyup' });
    expect(controller.handleKeyUp(up)).toBe(true);
    expect(up.stopImmediatePropagation).toHaveBeenCalled();
    expect(controller.handleKeyUp(key('KeyN', { type: 'keyup' }))).toBe(false);
  });

  it('leaves unbound ⌘ shortcuts such as ⌘C to the app', () => {
    const { controller, runBinding, holdMainmod } = setup();
    holdMainmod();
    const event = key('KeyC');
    expect(controller.handleKeyDown(event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(runBinding).not.toHaveBeenCalled();
  });

  it.each([
    ['Shift', { shiftKey: true }],
    ['Option', { altKey: true }],
    ['Control', { ctrlKey: true }],
  ])('leaves %s combinations such as ⌘⇧N to the app', (_name, modifier) => {
    const { controller, runBinding, holdMainmod } = setup();
    holdMainmod();
    const event = key('KeyN', modifier);
    expect(controller.handleKeyDown(event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(runBinding).not.toHaveBeenCalled();
  });

  it('treats a key without a held mainmod as a plain ⌘ shortcut on Right ⌘', () => {
    const { controller, runBinding } = setup();
    controller.handleKeyDown(key('MetaRight'));
    const event = key('KeyJ');
    expect(controller.handleKeyDown(event)).toBe(false);
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(runBinding).not.toHaveBeenCalled();
  });

  it('only shows task numbers after the hold delay or a typed count', () => {
    const { controller, state, scheduled, holdMainmod } = setup();
    holdMainmod();
    expect(state.showTaskNumbers).toBe(false);
    controller.handleKeyDown(key('Digit3'));
    expect(state.showTaskNumbers).toBe(true);

    controller.reset();
    holdMainmod();
    scheduled.at(-1)?.();
    expect(state.showTaskNumbers).toBe(true);
  });
});
