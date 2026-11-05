import { conversationRegistry } from '@core/features/conversations/api/browser/stores/conversation-registry';
import { getAcpChatResourceManager } from '@core/features/conversations/browser/acp/acp-chat-resource-manager';
import { getConversationSessionManager } from '@core/features/conversations/browser/stores/conversation-session-manager';

/**
 * "Exit + resume": stops the conversation's agent process and starts it again on the same provider
 * session (e.g. `claude --resume <id>`). History, worktree and the open tab are kept; the open
 * terminal keeps its output subscription, which the relaunched process publishes into.
 */
export async function restartConversationSession(
  projectId: string,
  taskId: string,
  conversationId: string
): Promise<void> {
  const manager = conversationRegistry.get(taskId);
  const conversation = manager?.conversations.get(conversationId);
  if (!manager || !conversation) throw new Error('Conversation not found');

  await manager.killSession(conversationId);

  if (conversation.data.type === 'acp') {
    getAcpChatResourceManager(taskId, projectId).get(conversationId)?.restart();
    return;
  }
  // Re-runs the tab's normal hydration. The conversation already has a provider session id, so
  // the host launches it in resume mode.
  getConversationSessionManager(taskId).retryHydration(conversationId);
}
