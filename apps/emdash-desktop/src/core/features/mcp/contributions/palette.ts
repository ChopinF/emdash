import { defineCommandPaletteItem } from '@core/primitives/palette/api';
import { mcpQuickListCommand } from './commands';

export const MCP_COMMAND_PALETTE_ITEMS = [
  defineCommandPaletteItem({ command: mcpQuickListCommand }),
] as const;
