import type { BrowserWindow, WebContents } from 'electron';
import type { MainmodSettings } from '@core/primitives/app-settings/api/app-settings';
import {
  MAINMOD_HOLD_CODE,
  MAINMOD_LAYER_CODES,
  MAINMOD_PLAIN_META_CODE,
} from '@core/primitives/keybindings/api/mainmod-keys';

/**
 * Left ⌘ is both the mainmod key and the everyday ⌘, so menu shortcuts are held back one key at a
 * time, and only for keys the renderer's mainmod layer claims. Without this guard Left ⌘+M would
 * also minimize and Left ⌘+R reload. ⌘C, ⌘V, ⌘Q and everything on Right ⌘ are untouched.
 */
let mainmodEnabled = true;
const guardedContents = new Set<WebContents>();

function releaseMenuShortcuts(contents: WebContents): void {
  if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(false);
}

export function setMainmodSettings(settings: MainmodSettings): void {
  mainmodEnabled = settings.key === 'leftMeta';
  if (!mainmodEnabled) guardedContents.forEach(releaseMenuShortcuts);
}

export function attachMainmodMenuGuard(window: BrowserWindow): void {
  const contents = window.webContents;
  let holdKeyDown = false;
  let plainMetaDown = false;
  guardedContents.add(contents);
  contents.on('before-input-event', (_event, input) => {
    if (input.code === MAINMOD_HOLD_CODE) holdKeyDown = input.type === 'keyDown';
    if (input.code === MAINMOD_PLAIN_META_CODE) plainMetaDown = input.type === 'keyDown';
    if (input.type !== 'keyDown') return;
    contents.setIgnoreMenuShortcuts(
      mainmodEnabled &&
        holdKeyDown &&
        !plainMetaDown &&
        input.meta &&
        !input.shift &&
        !input.alt &&
        !input.control &&
        MAINMOD_LAYER_CODES.has(input.code)
    );
  });
  window.on('blur', () => {
    holdKeyDown = false;
    plainMetaDown = false;
    releaseMenuShortcuts(contents);
  });
  contents.once('destroyed', () => guardedContents.delete(contents));
}
