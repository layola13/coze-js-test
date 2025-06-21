import { ChatHandler } from './core/chat-handler';
import { ConversationHandler } from './core/conversation-handler';
import { WorkflowHandler } from './core/workflow-handler';
import {
  ProxyConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelType,
  CozeConfig,
  ConversationConfig,
  WorkflowConfig,
} from './types';

export class OpenAIProxySDK {
  private chatHandler?: ChatHandler;
  private conversationHandler?: ConversationHandler;
  private workflowHandler?: WorkflowHandler;
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    const cozeConfig = this.config.coze;

    switch (this.config.modelType) {
      case 'chat':
        this.chatHandler = new ChatHandler(cozeConfig);
        break;
      case 'conversation':
        this.conversationHandler = new ConversationHandler(
          cozeConfig,
          this.config.conversation
        );
        break;
      case 'workflow':
        if (!this.config.workflow?.workflowId) {
          throw new Error('Workflow ID is required for workflow model type');
        }
        this.workflowHandler = new WorkflowHandler(cozeConfig, this.config.workflow);
        break;
      default:
        throw new Error(`Unsupported model type: ${this.config.modelType}`);
    }
  }

  // OpenAI-compatible chat completions endpoint
  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    switch (this.config.modelType) {
      case 'chat':
        if (!this.chatHandler) throw new Error('Chat handler not initialized');
        return this.chatHandler.createChatCompletion(request);

      case 'conversation':
        // For conversation mode, we'll use the chat completion interface
        // but maintain conversation state
        throw new Error('Use conversation-specific methods for conversation model type');

      case 'workflow':
        if (!this.workflowHandler) throw new Error('Workflow handler not initialized');
        return this.workflowHandler.runWorkflowChat(request);

      default:
        throw new Error(`Unsupported model type: ${this.config.modelType}`);
    }
  }

  // OpenAI-compatible streaming chat completions
  async *createChatCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk> {
    if (this.config.modelType !== 'chat') {
      throw new Error('Streaming only supported for chat model type');
    }

    if (!this.chatHandler) throw new Error('Chat handler not initialized');

    for await (const chunk of this.chatHandler.createChatCompletionStream(request)) {
      yield chunk;
    }
  }

  // Conversation-specific methods
  async createConversation(messages: any[] = []) {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.createConversation(messages);
  }

  async addMessage(content: string | any[], role: 'user' | 'assistant' = 'user') {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.addMessage(content, role);
  }

  async getMessages() {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.getMessages();
  }

  async updateMessage(messageId: string, content: string, metaData?: Record<string, any>) {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.updateMessage(messageId, content, metaData);
  }

  async deleteMessage(messageId: string) {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.deleteMessage(messageId);
  }

  async clearConversation() {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    return this.conversationHandler.clearConversation();
  }

  // Workflow-specific methods
  async runWorkflow(parameters: Record<string, any> = {}) {
    if (!this.workflowHandler) {
      throw new Error('Workflow handler not available for this model type');
    }
    return this.workflowHandler.runWorkflow(parameters);
  }

  async *runWorkflowStream(parameters: Record<string, any> = {}) {
    if (!this.workflowHandler) {
      throw new Error('Workflow handler not available for this model type');
    }

    for await (const event of this.workflowHandler.runWorkflowStream(parameters)) {
      yield event;
    }
  }

  async resumeWorkflow(eventId: string, resumeData: any, interruptType: string) {
    if (!this.workflowHandler) {
      throw new Error('Workflow handler not available for this model type');
    }
    return this.workflowHandler.resumeWorkflow(eventId, resumeData, interruptType);
  }

  async getWorkflowHistory(executeId: string) {
    if (!this.workflowHandler) {
      throw new Error('Workflow handler not available for this model type');
    }
    return this.workflowHandler.getWorkflowHistory(executeId);
  }

  // Configuration methods
  updateCozeConfig(updates: Partial<CozeConfig>): void {
    this.config.coze = { ...this.config.coze, ...updates };

    if (this.chatHandler) {
      this.chatHandler.updateConfig(this.config.coze);
    }
    if (this.conversationHandler) {
      this.conversationHandler.updateConfig(this.config.coze);
    }
    if (this.workflowHandler) {
      this.workflowHandler.updateConfig(this.config.coze);
    }
  }

  updateConversationConfig(updates: Partial<ConversationConfig>): void {
    if (!this.conversationHandler) {
      throw new Error('Conversation handler not available for this model type');
    }
    this.config.conversation = { ...this.config.conversation, ...updates };
    this.conversationHandler.updateConversationConfig(updates);
  }

  updateWorkflowConfig(updates: Partial<WorkflowConfig>): void {
    if (!this.workflowHandler) {
      throw new Error('Workflow handler not available for this model type');
    }
    this.config.workflow = { ...this.config.workflow, ...updates };
    this.workflowHandler.updateWorkflowConfig(updates);
  }

  // Switch model type (reinitializes handlers)
  switchModelType(modelType: ModelType, additionalConfig?: any): void {
    this.config.modelType = modelType;

    if (modelType === 'workflow' && additionalConfig?.workflow) {
      this.config.workflow = additionalConfig.workflow;
    }
    if (modelType === 'conversation' && additionalConfig?.conversation) {
      this.config.conversation = additionalConfig.conversation;
    }

    // Reset handlers
    this.chatHandler = undefined;
    this.conversationHandler = undefined;
    this.workflowHandler = undefined;

    this.initializeHandlers();
  }

  // Get current configuration
  getConfig(): ProxyConfig {
    return { ...this.config };
  }
}
