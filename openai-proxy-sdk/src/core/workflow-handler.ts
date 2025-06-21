import { WorkflowEventType, type WorkflowEvent, type WorkflowEventInterrupt } from '@coze/api';
import { CozeClient } from './client';
import { MessageConverter } from './message-converter';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  CozeConfig,
  WorkflowConfig,
} from '../types';

export class WorkflowHandler {
  private cozeClient: CozeClient;
  private workflowConfig: WorkflowConfig;

  constructor(cozeConfig: CozeConfig, workflowConfig: WorkflowConfig) {
    this.cozeClient = new CozeClient(cozeConfig);
    this.workflowConfig = workflowConfig;
  }

  async runWorkflow(parameters: Record<string, any> = {}) {
    const mergedParams = { ...this.workflowConfig.parameters, ...parameters };

    if (this.workflowConfig.isAsync) {
      return this.runAsyncWorkflow(mergedParams);
    } else {
      return this.runSyncWorkflow(mergedParams);
    }
  }

  async *runWorkflowStream(parameters: Record<string, any> = {}) {
    const mergedParams = { ...this.workflowConfig.parameters, ...parameters };

    const stream = await this.cozeClient.getClient().workflows.runs.stream({
      workflow_id: this.workflowConfig.workflowId,
      parameters: mergedParams,
      bot_id: this.cozeClient.getConfig().botId,
    });

    for await (const event of stream) {
      if (event.event === WorkflowEventType.INTERRUPT) {
        const interrupt = event.data as WorkflowEventInterrupt;
        // Handle interrupts - you might want to provide a callback mechanism
        yield { type: 'interrupt', data: interrupt };
      } else {
        yield { type: 'event', data: event };
      }
    }
  }

  async resumeWorkflow(eventId: string, resumeData: any, interruptType: string) {
    const stream = await this.cozeClient.getClient().workflows.runs.resume({
      workflow_id: this.workflowConfig.workflowId,
      event_id: eventId,
      resume_data: resumeData,
      interrupt_type: interruptType,
    });

    return stream;
  }

  async runWorkflowChat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const cozeMessages = MessageConverter.openAIToCoze(request.messages);

    const stream = await this.cozeClient.getClient().workflows.chat.stream({
      workflow_id: this.workflowConfig.workflowId,
      parameters: this.workflowConfig.parameters || {},
      bot_id: this.cozeClient.getConfig().botId,
      additional_messages: cozeMessages,
    });

    let result = '';
    let chatId = '';

    for await (const event of stream) {
      if (event.event === 'workflow.chat.message.delta') {
        result += event.data.content || '';
      } else if (event.event === 'workflow.chat.created') {
        chatId = event.data.id;
      }
    }

    return {
      id: chatId || 'workflow-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: result },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  async getWorkflowHistory(executeId: string) {
    return await this.cozeClient.getClient().workflows.runs.history(
      this.workflowConfig.workflowId,
      executeId
    );
  }

  private async runSyncWorkflow(parameters: Record<string, any>) {
    return await this.cozeClient.getClient().workflows.runs.create({
      workflow_id: this.workflowConfig.workflowId,
      parameters,
      bot_id: this.cozeClient.getConfig().botId,
      is_async: false,
    });
  }

  private async runAsyncWorkflow(parameters: Record<string, any>) {
    const result = await this.cozeClient.getClient().workflows.runs.create({
      workflow_id: this.workflowConfig.workflowId,
      parameters,
      bot_id: this.cozeClient.getConfig().botId,
      is_async: true,
    });

    // For async workflows, you might want to poll for completion
    return result;
  }

  async pollAsyncWorkflow(executeId: string, intervalMs = 1000, maxAttempts = 60) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const history = await this.getWorkflowHistory(executeId);

      if (history.length > 0 && history[0].execute_status !== 'Running') {
        return history[0];
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error('Workflow polling timeout');
  }

  updateConfig(updates: Partial<CozeConfig>): void {
    this.cozeClient.updateConfig(updates);
  }

  updateWorkflowConfig(updates: Partial<WorkflowConfig>): void {
    this.workflowConfig = { ...this.workflowConfig, ...updates };
  }

  getWorkflowId(): string {
    return this.workflowConfig.workflowId;
  }
}
