import { MAINMOD_KEYMAP, runMainmodBinding } from '@core/manifests/browser/mainmod-keymap';
import type { MainmodKey } from '@core/primitives/app-settings/api/app-settings';
import { MainmodController } from '@core/primitives/keybindings/browser/mainmod/mainmod-controller';

let currentMainmodKey: MainmodKey = 'leftMeta';

/** Kept in sync with the `mainmod` app setting by `KeybindingDispatcherMount`. */
export function setMainmodKey(key: MainmodKey): void {
  currentMainmodKey = key;
}

export const mainmodController = new MainmodController({
  keymap: () => MAINMOD_KEYMAP,
  runBinding: runMainmodBinding,
  mainmodKey: () => currentMainmodKey,
});
