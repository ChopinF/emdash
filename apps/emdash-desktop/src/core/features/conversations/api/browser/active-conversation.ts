import { conversationRegistry } from '@core/features/conversations/api/browser/stores/conversation-registry';
import { AcpChatTabResource } from '@core/features/conversations/browser/acp/acp-chat-tab-resource';
import { ConversationTabResource } from '@core/features/conversations/browser/conversation-tab-resource';
import { getTaskComposition } from '@core/features/workbench/api/browser/task-composition-selectors';

/** Conversation shown in the focused pane's active tab (PTY or ACP), if any. */
export function activeConversationIdForTask(projectId: string, taskId: string): string | undefined {
  const tab = getTaskComposition(projectId, taskId)?.activePane?.resolvedTabs.find(
    (candidate) => candidate.isActive
  );
  const resource = tab?.resource;
  if (resource instanceof ConversationTabResource) return resource.store.data.id;
  if (resource instanceof AcpChatTabResource) return resource.store.conversationId;
  return undefined;
}

/** Agent provider (e.g. `claude`) of the conversation in the focused pane's active tab. */
export function activeConversationProviderIdForTask(
  projectId: string,
  taskId: string
): string | undefined {
  const conversationId = activeConversationIdForTask(projectId, taskId);
  if (!conversationId) return undefined;
  return conversationRegistry.get(taskId)?.conversations.get(conversationId)?.data.providerId;
}
