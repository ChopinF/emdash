import { defineCommand } from '@core/primitives/commands/api';

export const mcpQuickListCommand = defineCommand({
  id: 'mcp.quickList',
  title: 'Show MCP Servers',
  description: 'List the MCP servers configured for the agent in the active chat',
  category: 'MCP',
  icon: 'plug',
});

/** MCP commands work from any view, so they live on the window scope. */
export const MCP_COMMAND_DEFS = [mcpQuickListCommand] as const;
