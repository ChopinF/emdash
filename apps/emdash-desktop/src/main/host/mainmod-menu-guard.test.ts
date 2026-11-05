import type { BrowserWindow, Input } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attachMainmodMenuGuard, setMainmodSettings } from './mainmod-menu-guard';

type InputHandler = (event: unknown, input: Input) => void;

function input(code: string, overrides: Partial<Input> = {}): Input {
  return {
    type: 'keyDown',
    code,
    key: '',
    meta: true,
    shift: false,
    alt: false,
    control: false,
    ...overrides,
  } as Input;
}

function setup() {
  let sendInput: InputHandler = () => {};
  let blur = () => {};
  const setIgnoreMenuShortcuts = vi.fn<(ignore: boolean) => void>();
  const window = {
    webContents: {
      on: (_event: string, handler: InputHandler) => {
        sendInput = handler;
      },
      once: () => {},
      isDestroyed: () => false,
      setIgnoreMenuShortcuts,
    },
    on: (_event: string, handler: () => void) => {
      blur = handler;
    },
  } as unknown as BrowserWindow;
  attachMainmodMenuGuard(window);
  return {
    send: (event: Input) => sendInput({}, event),
    blur: () => blur(),
    lastIgnore: () => setIgnoreMenuShortcuts.mock.lastCall?.[0],
  };
}

describe('mainmod menu guard', () => {
  beforeEach(() => setMainmodSettings({ key: 'leftMeta' }));

  it('holds back the menu shortcut of a layer key on Left ⌘', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('KeyR'));
    expect(lastIgnore()).toBe(true);
  });

  it('keeps menu shortcuts the layer does not use, such as ⌘C and ⌘Q', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('KeyR'));
    send(input('KeyC'));
    expect(lastIgnore()).toBe(false);
    send(input('KeyQ'));
    expect(lastIgnore()).toBe(false);
  });

  it('keeps ⌘0 for resetting the zoom', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('Digit0'));
    expect(lastIgnore()).toBe(false);
  });

  it('keeps every shortcut on Right ⌘', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaRight'));
    send(input('KeyR'));
    expect(lastIgnore()).toBe(false);
  });

  it('gives Left ⌘ its menu shortcuts back while Right ⌘ is also held', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('MetaRight'));
    send(input('KeyR'));
    expect(lastIgnore()).toBe(false);
  });

  it.each([
    ['Shift', { shift: true }],
    ['Option', { alt: true }],
    ['Control', { control: true }],
  ])('keeps %s combinations of layer keys', (_name, modifier) => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('KeyR', modifier));
    expect(lastIgnore()).toBe(false);
  });

  it('stops holding keys back once Left ⌘ is released', () => {
    const { send, lastIgnore } = setup();
    send(input('MetaLeft'));
    send(input('KeyR'));
    send(input('MetaLeft', { type: 'keyUp', meta: false }));
    send(input('KeyR', { meta: false }));
    expect(lastIgnore()).toBe(false);
  });

  it('forgets a held key when the window loses focus', () => {
    const { send, blur, lastIgnore } = setup();
    send(input('MetaLeft'));
    blur();
    expect(lastIgnore()).toBe(false);
    send(input('KeyR'));
    expect(lastIgnore()).toBe(false);
  });

  it('does nothing when mainmod is off', () => {
    const { send, lastIgnore } = setup();
    setMainmodSettings({ key: 'off' });
    send(input('MetaLeft'));
    send(input('KeyR'));
    expect(lastIgnore()).toBe(false);
  });
});
