import { SettingsCard } from '@emdash/ui/react/patterns';
import { Kbd, SeparatedList, Switch } from '@emdash/ui/react/primitives';
import React from 'react';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { MAINMOD_KEYMAP } from '@core/manifests/browser/mainmod-keymap';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

type KeymapRow = { id: string; title: string; labels: string[] };

const KEYMAP_ROWS: KeymapRow[] = (() => {
  const rows = new Map<string, KeymapRow>();
  for (const binding of MAINMOD_KEYMAP) {
    const id = binding.command.id;
    const row = rows.get(id) ?? { id, title: binding.command.title, labels: [] };
    row.labels.push(binding.label);
    rows.set(id, row);
  }
  return [...rows.values()];
})();

/** Hyprland-style mainmod layer: hold Left ⌘ and press a key. */
const MainmodSettingsCard: React.FC = () => {
  const { value, update, isLoading, isSaving, isFieldOverridden, resetField } =
    useAppSettingsKey('mainmod');
  const busy = isLoading || isSaving;
  const enabled = (value?.key ?? 'leftMeta') === 'leftMeta';

  return (
    <SettingsCard>
      <SeparatedList gap="1rem" direction="column">
        <SettingRow
          title="Mainmod (Left ⌘)"
          description="Hold Left ⌘ and press a key to navigate and act without the mouse. Hold it briefly to see the keys. The keys below and 1–9 replace their usual ⌘ shortcuts on Left ⌘, and Right ⌘ keeps those. Every other ⌘ shortcut works as normal."
          control={
            <>
              <ResetToDefaultButton
                visible={isFieldOverridden('key')}
                defaultLabel="on"
                onReset={() => resetField('key')}
                disabled={busy}
              />
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => update({ key: checked ? 'leftMeta' : 'off' })}
                disabled={busy}
              />
            </>
          }
        />
        {enabled && (
          <ul className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
            {KEYMAP_ROWS.map((row) => (
              <li key={row.id} className="contents">
                <span className="flex justify-end gap-1">
                  {row.labels.map((label) => (
                    <Kbd key={label} className="h-5 min-w-5 px-1 font-mono text-[11px]">
                      {label}
                    </Kbd>
                  ))}
                </span>
                <span className="text-foreground/80">{row.title}</span>
              </li>
            ))}
            <li className="contents">
              <span className="flex justify-end">
                <Kbd className="h-5 px-1 font-mono text-[11px]">1–9</Kbd>
              </span>
              <span className="text-foreground/60">
                Count prefix: Left ⌘ 3 j jumps three tasks down (numbers show in the sidebar)
              </span>
            </li>
          </ul>
        )}
      </SeparatedList>
    </SettingsCard>
  );
};

export default MainmodSettingsCard;
