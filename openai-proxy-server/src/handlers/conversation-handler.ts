import { CozeAPI } from '@coze/api';
import { MessageConverter } from '../message-converter';
import { JWTManager } from '../jwt-manager';
import type {
  OpenAIChatCompletionRequest,
  ProxyConfig,
  ConversationSession
} from '../types';

export class ConversationHandler {
  private coze: CozeAPI;
  private config: ProxyConfig;
  private jwtManager: JWTManager;
  private sessions: Map<string, ConversationSession> = new Map();

  constructor(config: ProxyConfig, jwtManager: JWTManager) {
    this.config = config;
    this.jwtManager = jwtManager;
    this.coze = new CozeAPI({
      token: async () => {
        return await this.jwtManager.getToken();
      },
      baseURL: config.coze.baseURL,
    });
  }

  /**
   * Handle conversation-based chat completion
   */
  async handleConversationCompletion(request: OpenAIChatCompletionRequest) {
    const botId = request['x-bot-id'] || this.config.coze.botId;
    const conversationId = request['x-conversation-id'];

    if (!botId) {
      throw new Error('Bot ID is required for conversation completion');
    }

    let session: ConversationSession;

    if (conversationId && this.sessions.has(conversationId)) {
      // Use existing conversation
      session = this.sessions.get(conversationId)!;
    } else {
      // Create new conversation
      const cozeMessages = request.messages.map(msg =>
        MessageConverter.openAIToCoze(msg)
      );

      const conversation = await this.coze.conversations.create({
        bot_id: botId,
        messages: cozeMessages,
      });

      session = {
        id: conversation.id,
        conversationId: conversation.id,
        messages: request.messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.sessions.set(conversation.id, session);
    }

    // Get the last user message to respond to
    const lastUserMessage = request.messages[request.messages.length - 1];
    if (lastUserMessage.role === 'user') {
      // Add new message to conversation
      const cozeMessage = MessageConverter.openAIToCoze(lastUserMessage);

      const messageResponse = await this.coze.conversations.messages.create(
        session.conversationId!,
        cozeMessage
      );

      // Update session
      session.messages.push(lastUserMessage);
      session.updatedAt = Date.now();

      // Get conversation messages to find the response
      const messages = await this.coze.conversations.messages.list(
        session.conversationId!
      );

      // Find the latest assistant message
      const assistantMessage = messages.data?.find(
        msg => msg.role === 'assistant' && msg.id !== messageResponse.id
      );

      const content = assistantMessage?.content || 'No response generated';

      return MessageConverter.createChatCompletionResponse(
        request.model,
        content
      );
    }

    throw new Error('No user message found to respond to');
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string) {
    const session = this.sessions.get(conversationId);
    if (!session) {
      throw new Error('Conversation not found');
    }

    const messages = await this.coze.conversations.messages.list(
      session.conversationId!
    );

    return {
      session,
      messages: messages.data?.map(msg => MessageConverter.cozeToOpenAI(msg)) || [],
    };
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId: string) {
    const session = this.sessions.get(conversationId);
    if (!session) {
      throw new Error('Conversation not found');
    }

    await this.coze.conversations.clear(session.conversationId!);
    this.sessions.delete(conversationId);

    return { success: true };
  }

  /**
   * List all conversations
   */
  listConversations() {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }
}
