import { isDeepEqual } from '@emdash/shared';
import { reaction } from 'mobx';
import { useEffect } from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { keybindingService } from '@core/primitives/keybindings/browser/keybinding-service';
import { getDesktopWireClient } from '@renderer/lib/runtime/desktop-wire-client';
import { keybindingDispatcher } from './keybinding-dispatcher';
import { mainmodController, setMainmodKey } from './mainmod';

export function KeybindingDispatcherMount() {
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const { value: mainmod } = useAppSettingsKey('mainmod');
  const mainmodKey = mainmod?.key ?? 'leftMeta';

  useEffect(() => {
    setMainmodKey(mainmodKey);
    if (mainmodKey === 'off') mainmodController.reset();
  }, [mainmodKey]);

  useEffect(() => {
    keybindingService.setOverrides(keyboard);
  }, [keyboard]);

  useEffect(() => {
    // The mainmod layer must see keydown before the dispatcher: same-target capture listeners run
    // in registration order, and the layer claims its keys with stopImmediatePropagation.
    const detachMainmod = mainmodController.attach(window);
    const detachDispatcher = keybindingDispatcher.attach(window);
    return () => {
      detachDispatcher();
      detachMainmod();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let disposeReaction: (() => void) | undefined;
    void getDesktopWireClient().then((client) => {
      if (disposed) return;
      disposeReaction = reaction(
        () => keybindingService.snapshotForMenu(),
        (snapshot) => {
          void client.host.setMenuKeybindings([...snapshot]);
        },
        { fireImmediately: true, equals: isDeepEqual }
      );
    });
    return () => {
      disposed = true;
      disposeReaction?.();
    };
  }, []);

  return null;
}
