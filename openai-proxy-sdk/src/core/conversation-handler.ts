import { CozeClient } from './client';
import { MessageConverter } from './message-converter';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  CozeConfig,
  ConversationConfig,
} from '../types';

export class ConversationHandler {
  private cozeClient: CozeClient;
  private conversationConfig: ConversationConfig;

  constructor(cozeConfig: CozeConfig, conversationConfig: ConversationConfig = {}) {
    this.cozeClient = new CozeClient(cozeConfig);
    this.conversationConfig = conversationConfig;
  }

  async createConversation(messages: any[] = []) {
    const botId = this.cozeClient.getConfig().botId;

    const conversation = await this.cozeClient.getClient().conversations.create({
      bot_id: botId,
      messages: messages.length > 0 ? MessageConverter.openAIToCoze(messages) : [],
      meta_data: this.conversationConfig.metaData || {},
    });

    this.conversationConfig.conversationId = conversation.id;
    return conversation;
  }

  async addMessage(content: string | any[], role: 'user' | 'assistant' = 'user') {
    if (!this.conversationConfig.conversationId) {
      throw new Error('Conversation not created. Call createConversation first.');
    }

    const message = await this.cozeClient.getClient().conversations.messages.create(
      this.conversationConfig.conversationId,
      {
        role: MessageConverter.openAIToCoze([{ role, content }])[0].role,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        content_type: typeof content === 'string' ? 'text' : 'object_string',
        meta_data: this.conversationConfig.metaData || {},
      }
    );

    return message;
  }

  async getMessages() {
    if (!this.conversationConfig.conversationId) {
      throw new Error('Conversation not created. Call createConversation first.');
    }

    const messages = await this.cozeClient.getClient().conversations.messages.list(
      this.conversationConfig.conversationId
    );

    return MessageConverter.cozeToOpenAI(messages.data || []);
  }

  async updateMessage(messageId: string, content: string, metaData?: Record<string, any>) {
    if (!this.conversationConfig.conversationId) {
      throw new Error('Conversation not created. Call createConversation first.');
    }

    return await this.cozeClient.getClient().conversations.messages.update(
      this.conversationConfig.conversationId,
      messageId,
      {
        content,
        content_type: 'text',
        meta_data: metaData || {},
      }
    );
  }

  async deleteMessage(messageId: string) {
    if (!this.conversationConfig.conversationId) {
      throw new Error('Conversation not created. Call createConversation first.');
    }

    return await this.cozeClient.getClient().conversations.messages.delete(
      this.conversationConfig.conversationId,
      messageId
    );
  }

  async clearConversation() {
    if (!this.conversationConfig.conversationId) {
      throw new Error('Conversation not created. Call createConversation first.');
    }

    return await this.cozeClient.getClient().conversations.clear(
      this.conversationConfig.conversationId
    );
  }

  async listConversations(pageNum = 1, pageSize = 50) {
    const botId = this.cozeClient.getConfig().botId;

    return await this.cozeClient.getClient().conversations.list({
      bot_id: botId,
      page_num: pageNum,
      page_size: pageSize,
    });
  }

  getConversationId(): string | undefined {
    return this.conversationConfig.conversationId;
  }

  setConversationId(conversationId: string): void {
    this.conversationConfig.conversationId = conversationId;
  }

  updateConfig(updates: Partial<CozeConfig>): void {
    this.cozeClient.updateConfig(updates);
  }

  updateConversationConfig(updates: Partial<ConversationConfig>): void {
    this.conversationConfig = { ...this.conversationConfig, ...updates };
  }
}
