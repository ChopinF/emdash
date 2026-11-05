import { Kbd } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { MAINMOD_KEYMAP } from '@core/manifests/browser/mainmod-keymap';
import type { MainmodBinding } from '@core/primitives/keybindings/browser/mainmod/mainmod-controller';
import { mainmodState } from '@core/primitives/keybindings/browser/mainmod/mainmod-state';

type OverlayRow = { title: string; labels: string[] };

/** Groups bindings that run the same command, e.g. `j` and `↓` → "Next Task". */
function overlayRows(keymap: readonly MainmodBinding[]): OverlayRow[] {
  const rows = new Map<string, OverlayRow>();
  for (const binding of keymap) {
    const row = rows.get(binding.command.id) ?? { title: binding.command.title, labels: [] };
    row.labels.push(binding.label);
    rows.set(binding.command.id, row);
  }
  return [...rows.values()];
}

const ROWS = overlayRows(MAINMOD_KEYMAP);

function pendingLabel(code: string | null): string | null {
  if (code === null) return null;
  return MAINMOD_KEYMAP.find((binding) => binding.keys[0] === code)?.label.split(' ')[0] ?? null;
}

/**
 * Which-key style hint for the mainmod layer: lists the layer's bindings after the key has been
 * held briefly, echoes a typed count / pending sequence, and shows transient "not available" notes.
 */
export const MainmodOverlay = observer(function MainmodOverlay() {
  const { overlayVisible, count, pending, flash, held } = mainmodState;
  const pendingKey = pendingLabel(pending);
  const showStatus = held && (count.length > 0 || pendingKey !== null);
  if (!overlayVisible && !showStatus && !flash) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur"
    >
      {(showStatus || overlayVisible) && (
        <div className="flex items-center gap-2 text-foreground/60">
          <Kbd className="h-5 px-1.5 text-[11px]">Left ⌘</Kbd>
          {count && <span className="font-mono text-foreground">{count}</span>}
          {pendingKey && <span className="font-mono text-foreground">{pendingKey}…</span>}
        </div>
      )}
      {overlayVisible && (
        <ul className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
          {ROWS.map((row) => (
            <li key={row.title} className="contents">
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
            <span className="text-foreground/60">Count prefix for j / k</span>
          </li>
        </ul>
      )}
      {flash && <div className="mt-1 text-foreground/70 first:mt-0">{flash}</div>}
    </div>
  );
});
