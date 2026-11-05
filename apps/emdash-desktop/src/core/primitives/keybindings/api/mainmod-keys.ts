import type { KeyCode } from './key-codes';

/** Held to enter the mainmod layer: Left ⌘, the key directly left of the space bar on a Mac. */
export const MAINMOD_HOLD_CODE = 'MetaLeft' satisfies KeyCode;

/** Never enters the layer, so every ⌘ shortcut the layer takes stays reachable on Right ⌘. */
export const MAINMOD_PLAIN_META_CODE = 'MetaRight' satisfies KeyCode;

/** Keys the mainmod keymap may bind. Add a key here to bind it in `MAINMOD_KEYMAP`. */
export const MAINMOD_BINDABLE_CODES = [
  'KeyJ',
  'KeyK',
  'KeyN',
  'KeyT',
  'KeyR',
  'KeyD',
  'KeyU',
  'KeyM',
  'ArrowDown',
  'ArrowUp',
] as const satisfies readonly KeyCode[];

export type MainmodBindableCode = (typeof MAINMOD_BINDABLE_CODES)[number];

/**
 * Keys the layer takes over from Left ⌘, shared with the main process so it can hold back only
 * these menu shortcuts. `Digit0` is left out so Left ⌘ 0 still resets the zoom: the layer only
 * uses it inside a count, as in `1 0 j`.
 */
export const MAINMOD_LAYER_CODES: ReadonlySet<string> = new Set<KeyCode>([
  ...MAINMOD_BINDABLE_CODES,
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
]);
