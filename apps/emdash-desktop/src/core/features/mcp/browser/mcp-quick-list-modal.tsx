import type { HostRef } from '@emdash/core/primitives/host/api';
import type { McpServer } from '@emdash/core/primitives/mcp/api';
import { Command } from 'cmdk';
import { useMemo } from 'react';
import { hostRefFromConnectionId } from '@core/features/agents/api/browser/client';
import { useAgentMcps } from '@core/features/agents/api/browser/use-agent-mcps';
import { useAgent } from '@core/features/agents/api/browser/use-agents';
import { getProjectSshConnectionId } from '@core/features/projects/api/browser/stores/project-selectors';
import { settingsViewDef } from '@core/features/settings/contributions/views';
import { useModalController } from '@core/manifests/browser/modal-api';
import { Shortcut } from '@core/primitives/keybindings/browser/shortcut';
import { defineModal } from '@core/primitives/modals/react';
import { getNavigation } from '@core/primitives/navigation/browser/navigation-selectors';
import { useInstalledMcpServersLiveModel } from './live-model-hooks';

export type McpQuickListModalArgs = {
  /** Project of the current view; selects the host whose agent configs are read. */
  projectId?: string;
  /** Agent of the active chat. Without it, every configured server is listed. */
  providerId?: string;
};

function serverDetail(server: McpServer): string {
  if (server.transport === 'http') return server.url ?? '';
  return [server.command, ...(server.args ?? [])].filter(Boolean).join(' ');
}

function ServerRows({
  servers,
  showProviders,
  onSelect,
}: {
  servers: readonly McpServer[];
  showProviders: boolean;
  onSelect: () => void;
}) {
  return servers.map((server) => (
    <Command.Item
      key={server.name}
      value={server.name}
      onSelect={onSelect}
      className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-foreground/10"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-foreground">{server.name}</span>
        <span className="shrink-0 rounded bg-foreground/10 px-1 font-mono text-[10px] text-foreground/60">
          {server.transport}
        </span>
        {server.enabled === false && (
          <span className="shrink-0 text-[11px] text-foreground/40">disabled</span>
        )}
        {showProviders && server.providers.length > 0 && (
          <span className="ml-auto shrink-0 truncate text-[11px] text-foreground/40">
            {server.providers.join(', ')}
          </span>
        )}
      </span>
      <span className="truncate font-mono text-[11px] text-foreground/45">
        {serverDetail(server)}
      </span>
    </Command.Item>
  ));
}

function AgentServers({
  host,
  providerId,
  onSelect,
}: {
  host: HostRef;
  providerId: string;
  onSelect: () => void;
}) {
  const { servers, isLoading } = useAgentMcps(providerId, host);
  const { data: agent } = useAgent(providerId, host);
  const agentName = agent?.name ?? providerId;
  return (
    <QuickList
      heading={`MCP servers · ${agentName}`}
      emptyText={isLoading ? 'Loading…' : `No MCP servers configured for ${agentName}`}
    >
      <ServerRows servers={servers} showProviders={false} onSelect={onSelect} />
    </QuickList>
  );
}

function AllServers({ host, onSelect }: { host: HostRef; onSelect: () => void }) {
  const { data: servers, isLoading } = useInstalledMcpServersLiveModel(host);
  return (
    <QuickList
      heading="MCP servers · all agents"
      emptyText={isLoading ? 'Loading…' : 'No MCP servers configured'}
    >
      <ServerRows servers={servers} showProviders onSelect={onSelect} />
    </QuickList>
  );
}

function QuickList({
  heading,
  emptyText,
  children,
}: {
  heading: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Command className="flex flex-col overflow-hidden" loop>
      <div className="border-b border-foreground/10 px-3 pt-3 pb-1 text-xs font-medium text-foreground/50">
        {heading}
      </div>
      <div className="border-b border-foreground/10 px-2">
        <Command.Input
          autoFocus
          placeholder="Filter servers…"
          className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-foreground/40"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-1">
        <Command.Empty className="py-6 text-center text-sm text-foreground/40">
          {emptyText}
        </Command.Empty>
        {children}
      </Command.List>
      <div className="flex items-center gap-4 border-t border-foreground/10 px-3 py-2">
        <span className="flex items-center gap-1 text-xs text-foreground/40">
          <Shortcut hotkey="Enter" variant="keycaps" />
          Open MCP settings
        </span>
        <span className="flex items-center gap-1 text-xs text-foreground/40">
          <Shortcut hotkey="Escape" variant="keycaps" />
          Close
        </span>
        <span className="ml-auto text-[11px] text-foreground/35">
          From agent config files; live status is in the agent (/mcp)
        </span>
      </div>
    </Command>
  );
}

export function McpQuickListModal({ projectId, providerId }: McpQuickListModalArgs) {
  const { dismiss } = useModalController('mcpQuickListModal');
  const host = useMemo(
    () => hostRefFromConnectionId(projectId ? getProjectSshConnectionId(projectId) : undefined),
    [projectId]
  );
  const openSettings = () => {
    dismiss();
    getNavigation().navigate(settingsViewDef({ tab: 'mcp' }));
  };
  return providerId ? (
    <AgentServers host={host} providerId={providerId} onSelect={openSettings} />
  ) : (
    <AllServers host={host} onSelect={openSettings} />
  );
}

export const mcpQuickListModal = defineModal<void>()({
  id: 'mcpQuickListModal',
  component: McpQuickListModal,
  size: 'md',
  position: 'top',
});
