import { mcpQuickListCommand } from '@core/features/mcp/contributions/commands';
import {
  newConversationCommand,
  nextTaskCommand,
  previousTaskCommand,
  refreshConversationCommand,
  scheduleDeleteTaskCommand,
  undoDeleteTaskCommand,
} from '@core/features/tasks/contributions/commands';
import { newTaskCommand } from '@core/features/workbench/contributions/commands';
import type { MainmodBinding } from '@core/primitives/keybindings/browser/mainmod/mainmod-controller';
import { mainmodState } from '@core/primitives/keybindings/browser/mainmod/mainmod-state';
import { scopes } from '@core/primitives/view-scopes/browser/scopes';

/**
 * The mainmod layer: keys pressed while holding Left ⌘. Keys are physical `KeyboardEvent.code`
 * values from `MAINMOD_BINDABLE_CODES`. Edit this table to change the layer; the settings page
 * and overlay read it.
 */
export const MAINMOD_KEYMAP: readonly MainmodBinding[] = [
  { keys: ['KeyJ'], label: 'j', command: nextTaskCommand, acceptsCount: true, repeat: true },
  { keys: ['ArrowDown'], label: '↓', command: nextTaskCommand, acceptsCount: true, repeat: true },
  { keys: ['KeyK'], label: 'k', command: previousTaskCommand, acceptsCount: true, repeat: true },
  { keys: ['ArrowUp'], label: '↑', command: previousTaskCommand, acceptsCount: true, repeat: true },
  { keys: ['KeyN'], label: 'n', command: newTaskCommand },
  { keys: ['KeyT'], label: 't', command: newConversationCommand },
  { keys: ['KeyR'], label: 'r', command: refreshConversationCommand },
  { keys: ['KeyD', 'KeyD'], label: 'd d', command: scheduleDeleteTaskCommand },
  { keys: ['KeyU'], label: 'u', command: undoDeleteTaskCommand },
  { keys: ['KeyM'], label: 'm', command: mcpQuickListCommand },
];

/**
 * Runs a mainmod binding against the active view-scope path, exactly like a keybinding would
 * resolve, but without the focus gating (mainmod is a dedicated modifier, so it is safe inside
 * terminals, editors and inputs).
 */
export function runMainmodBinding(binding: MainmodBinding, count: number | undefined): void {
  const hit = scopes.resolveKeybinding(new Set([binding.command.id]));
  if (hit.kind === 'winner') {
    hit.command.execute(count === undefined ? undefined : { count }, 'keybinding');
    return;
  }
  const availability = scopes.getActiveCommand(binding.command)?.availability;
  mainmodState.showFlash(
    availability?.kind === 'disabled'
      ? availability.reason
      : `${binding.command.title} isn't available here`
  );
}
