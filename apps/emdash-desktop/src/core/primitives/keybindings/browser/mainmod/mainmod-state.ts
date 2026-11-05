import { makeAutoObservable } from 'mobx';

const FLASH_DURATION_MS = 1500;

/**
 * Observable state of the mainmod layer (Hyprland-style "hold a modifier, press a key").
 * Owned and mutated by `MainmodController`; read by the overlay and the sidebar.
 */
export class MainmodState {
  /** True while the mainmod key is physically held. */
  held = false;
  /** Vim-style count prefix typed while held, e.g. "3" in mainmod+3 j. */
  count = '';
  /** First key of a pending two-key sequence (e.g. `KeyD` of `d d`). */
  pending: string | null = null;
  /** True once mainmod has been held long enough to show the which-key overlay. */
  overlayVisible = false;
  /** Short transient message, e.g. "Next Task isn't available here". */
  flash: string | null = null;

  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    makeAutoObservable<MainmodState, 'flashTimer'>(this, { flashTimer: false });
  }

  get hasPartialInput(): boolean {
    return this.count.length > 0 || this.pending !== null;
  }

  /** Mainmod is also the everyday ⌘, so a quick ⌘C must not flash numbers in the sidebar. */
  get showTaskNumbers(): boolean {
    return this.overlayVisible || this.count.length > 0;
  }

  setHeld(held: boolean): void {
    this.held = held;
  }

  setOverlayVisible(visible: boolean): void {
    this.overlayVisible = visible;
  }

  appendCount(digit: string, maxDigits: number): void {
    if (this.count.length >= maxDigits) return;
    this.count += digit;
  }

  setPending(code: string | null): void {
    this.pending = code;
  }

  clearPartialInput(): void {
    this.count = '';
    this.pending = null;
  }

  showFlash(message: string): void {
    this.flash = message;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.clearFlash(), FLASH_DURATION_MS);
  }

  clearFlash(): void {
    this.flash = null;
  }

  /** Called when the mainmod key is released or the window loses focus. */
  release(): void {
    this.held = false;
    this.overlayVisible = false;
    this.count = '';
    this.pending = null;
  }
}

export const mainmodState = new MainmodState();
