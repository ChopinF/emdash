import type { Unsubscribe } from '@emdash/shared';
import type { MainmodKey } from '@core/primitives/app-settings/api/app-settings';
import type { CommandDef } from '@core/primitives/commands/api/define-command';
import {
  MAINMOD_HOLD_CODE,
  MAINMOD_PLAIN_META_CODE,
  type MainmodBindableCode,
} from '@core/primitives/keybindings/api/mainmod-keys';
import { mainmodState, type MainmodState } from './mainmod-state';

/**
 * One binding of the mainmod layer. `keys` are physical `KeyboardEvent.code` values so the layer
 * is keyboard-layout independent; two keys form a sequence (vim-style `d d`).
 */
export interface MainmodBinding {
  readonly keys:
    | readonly [MainmodBindableCode]
    | readonly [MainmodBindableCode, MainmodBindableCode];
  /** Human label for the overlay and settings, e.g. "j" or "d d". */
  readonly label: string;
  readonly command: CommandDef;
  /** When true, a typed count prefix is passed to the command as `{ count }`. */
  readonly acceptsCount?: boolean;
  /** When true, OS key-repeat re-runs the command while the key stays down. */
  readonly repeat?: boolean;
}

export type MainmodKeyEvent = Pick<
  KeyboardEvent,
  | 'type'
  | 'code'
  | 'repeat'
  | 'isComposing'
  | 'metaKey'
  | 'shiftKey'
  | 'altKey'
  | 'ctrlKey'
  | 'preventDefault'
  | 'stopImmediatePropagation'
>;

export interface MainmodTimers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface MainmodControllerOptions {
  readonly keymap: () => readonly MainmodBinding[];
  readonly runBinding: (binding: MainmodBinding, count: number | undefined) => void;
  readonly mainmodKey: () => MainmodKey;
  readonly state?: MainmodState;
  readonly timers?: MainmodTimers;
}

export const MAINMOD_OVERLAY_DELAY_MS = 400;
const MAX_COUNT_DIGITS = 3;
const PASS_THROUGH_MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'CapsLock',
  'Fn',
]);

const defaultTimers: MainmodTimers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Hyprland-style modifier layer: while Left ⌘ is held, single keys run commands.
 *
 * It must be attached to `window` in the capture phase *before* the keybinding dispatcher so it
 * can claim keys (`stopImmediatePropagation`) before the dispatcher, xterm or Monaco see them.
 * Keys with no mainmod binding pass through untouched and behave like ordinary ⌘+key, as does
 * anything combined with Shift, ⌥ or ⌃, and everything on Right ⌘.
 */
export class MainmodController {
  private readonly options: MainmodControllerOptions;
  private readonly state: MainmodState;
  private readonly timers: MainmodTimers;
  private holdKeyDown = false;
  private plainMetaDown = false;
  private overlayTimer: unknown;
  /** Codes whose keydown we claimed; their keyup is claimed too. */
  private readonly claimedCodes = new Set<string>();

  constructor(options: MainmodControllerOptions) {
    this.options = options;
    this.state = options.state ?? mainmodState;
    this.timers = options.timers ?? defaultTimers;
  }

  get isActive(): boolean {
    return this.options.mainmodKey() === 'leftMeta' && this.holdKeyDown && !this.plainMetaDown;
  }

  /** Returns true when the event was claimed by the layer. */
  handleKeyDown(event: MainmodKeyEvent): boolean {
    if (event.code === MAINMOD_HOLD_CODE) {
      this.holdKeyDown = true;
      if (this.isActive && !event.repeat && !this.state.held) this.activate();
      return false;
    }
    if (event.code === MAINMOD_PLAIN_META_CODE) {
      this.plainMetaDown = true;
      if (this.state.held) this.deactivate();
      return false;
    }
    if (!this.isActive) return false;
    if (!event.metaKey) {
      // We missed the mainmod keyup (e.g. focus moved while held); resync.
      this.holdKeyDown = false;
      this.deactivate();
      return false;
    }
    if (event.isComposing || PASS_THROUGH_MODIFIER_CODES.has(event.code)) return false;

    this.cancelOverlayTimer();
    if (event.shiftKey || event.altKey || event.ctrlKey) return false;
    const code = event.code;

    if (code === 'Escape') {
      if (!this.state.hasPartialInput) return false;
      this.state.clearPartialInput();
      return this.claim(event);
    }

    const digit = /^Digit([0-9])$/.exec(code)?.[1];
    if (digit !== undefined && (digit !== '0' || this.state.count.length > 0)) {
      if (!event.repeat) this.state.appendCount(digit, MAX_COUNT_DIGITS);
      return this.claim(event);
    }

    const keymap = this.options.keymap();
    const pending = this.state.pending;
    if (pending !== null) {
      const binding = keymap.find(
        (candidate) =>
          candidate.keys.length === 2 && candidate.keys[0] === pending && candidate.keys[1] === code
      );
      if (event.repeat) return this.claim(event);
      if (binding) this.run(binding);
      else this.state.clearPartialInput();
      return this.claim(event);
    }

    const single = keymap.find(
      (candidate) => candidate.keys.length === 1 && candidate.keys[0] === code
    );
    if (single) {
      if (!event.repeat || single.repeat) this.run(single);
      return this.claim(event);
    }

    if (keymap.some((candidate) => candidate.keys.length === 2 && candidate.keys[0] === code)) {
      if (!event.repeat) this.state.setPending(code);
      return this.claim(event);
    }

    if (this.state.hasPartialInput) {
      this.state.clearPartialInput();
      return this.claim(event);
    }
    return false;
  }

  /** Returns true when the event was claimed by the layer. */
  handleKeyUp(event: MainmodKeyEvent): boolean {
    if (event.code === MAINMOD_HOLD_CODE) {
      this.holdKeyDown = false;
      this.deactivate();
      return false;
    }
    if (event.code === MAINMOD_PLAIN_META_CODE) {
      this.plainMetaDown = false;
      return false;
    }
    if (this.claimedCodes.delete(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
    return false;
  }

  /** Forget all held-key state, e.g. when the window loses focus. */
  reset(): void {
    this.holdKeyDown = false;
    this.plainMetaDown = false;
    this.claimedCodes.clear();
    this.deactivate();
  }

  attach(target: Window): Unsubscribe {
    const onKeyDown = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      this.handleKeyUp(event);
    };
    const onBlur = () => this.reset();
    const onVisibilityChange = () => {
      if (target.document.visibilityState === 'hidden') this.reset();
    };
    target.addEventListener('keydown', onKeyDown, { capture: true });
    target.addEventListener('keyup', onKeyUp, { capture: true });
    target.addEventListener('blur', onBlur);
    target.document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      target.removeEventListener('keydown', onKeyDown, { capture: true });
      target.removeEventListener('keyup', onKeyUp, { capture: true });
      target.removeEventListener('blur', onBlur);
      target.document.removeEventListener('visibilitychange', onVisibilityChange);
      this.reset();
    };
  }

  private run(binding: MainmodBinding): void {
    const count =
      binding.acceptsCount && this.state.count.length > 0 ? Number(this.state.count) : undefined;
    this.state.clearPartialInput();
    this.options.runBinding(binding, count);
  }

  private claim(event: MainmodKeyEvent): true {
    this.claimedCodes.add(event.code);
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }

  private activate(): void {
    this.state.setHeld(true);
    this.cancelOverlayTimer();
    this.overlayTimer = this.timers.set(() => {
      this.overlayTimer = undefined;
      if (this.state.held) this.state.setOverlayVisible(true);
    }, MAINMOD_OVERLAY_DELAY_MS);
  }

  private deactivate(): void {
    this.cancelOverlayTimer();
    this.state.release();
  }

  private cancelOverlayTimer(): void {
    if (this.overlayTimer === undefined) return;
    this.timers.clear(this.overlayTimer);
    this.overlayTimer = undefined;
  }
}
