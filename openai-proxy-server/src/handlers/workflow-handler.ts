import { CozeAPI, WorkflowEventType } from '@coze/api';
import { Response } from 'express';
import { MessageConverter } from '../message-converter';
import { JWTManager } from '../jwt-manager';
import type {
  OpenAIChatCompletionRequest,
  ProxyConfig,
  WorkflowSession
} from '../types';

export class WorkflowHandler {
  private coze: CozeAPI;
  private config: ProxyConfig;
  private jwtManager: JWTManager;
  private sessions: Map<string, WorkflowSession> = new Map();

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
   * Handle workflow-based completion
   */
  async handleWorkflowCompletion(request: OpenAIChatCompletionRequest) {
    const workflowId = request['x-workflow-id'] || this.config.coze.workflowId;
    if (!workflowId) {
      throw new Error('Workflow ID is required for workflow completion');
    }

    // Extract parameters from the last user message
    const lastMessage = request.messages[request.messages.length - 1];
    const input = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    const parameters = { input };

    // Run workflow
    const workflow = await this.coze.workflows.runs.create({
      workflow_id: workflowId,
      parameters,
    });

    // Create session
    const session: WorkflowSession = {
      id: workflow.execute_id,
      workflowId,
      parameters,
      createdAt: Date.now(),
    };
    this.sessions.set(workflow.execute_id, session);

    // Wait for completion if synchronous
    let result = workflow;
    while (result.execute_status === 'Running') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const history = await this.coze.workflows.runs.history(
        workflowId,
        workflow.execute_id
      );
      result = history[0];
    }

    const content = result.execute_status === 'Success'
      ? JSON.stringify(result.output || {})
      : `Workflow failed with status: ${result.execute_status}`;

    return MessageConverter.createChatCompletionResponse(
      request.model,
      content
    );
  }

  /**
   * Handle streaming workflow completion
   */
  async handleStreamingWorkflowCompletion(
    request: OpenAIChatCompletionRequest,
    res: Response
  ) {
    const workflowId = request['x-workflow-id'] || this.config.coze.workflowId;
    if (!workflowId) {
      throw new Error('Workflow ID is required for streaming workflow completion');
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      // Extract parameters from the last user message
      const lastMessage = request.messages[request.messages.length - 1];
      const input = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

      const parameters = { input };

      // Start streaming workflow
      const stream = await this.coze.workflows.runs.stream({
        workflow_id: workflowId,
        parameters,
      });

      // Send initial chunk
      const initialChunk = MessageConverter.createStreamingChunk(request.model, '');
      res.write(MessageConverter.formatSSE(initialChunk));

      let accumulatedOutput = '';

      for await (const event of stream) {
        if (event.event === WorkflowEventType.MESSAGE) {
          // Stream workflow output
          const content = event.data?.content || '';
          accumulatedOutput += content;

          const chunk = MessageConverter.createStreamingChunk(request.model, content);
          res.write(MessageConverter.formatSSE(chunk));
        }
        else if (event.event === WorkflowEventType.FINISH) {
          // Workflow completed
          const finalChunk = MessageConverter.createStreamingChunk(
            request.model,
            '',
            true
          );
          res.write(MessageConverter.formatSSE(finalChunk));
          res.write(MessageConverter.createSSEDone());
          break;
        }
        else if (event.event === WorkflowEventType.ERROR) {
          // Error occurred
          throw new Error(`Workflow error: ${event.data}`);
        }
        else if (event.event === WorkflowEventType.INTERRUPT) {
          // Handle workflow interruption
          const interruptMessage = 'Workflow requires user input';
          const chunk = MessageConverter.createStreamingChunk(request.model, interruptMessage);
          res.write(MessageConverter.formatSSE(chunk));

          // For now, we'll end the stream on interruption
          // In a real implementation, you might want to handle this differently
          const finalChunk = MessageConverter.createStreamingChunk(
            request.model,
            '',
            true
          );
          res.write(MessageConverter.formatSSE(finalChunk));
          res.write(MessageConverter.createSSEDone());
          break;
        }
      }
    } catch (error) {
      // Send error and close stream
      const errorChunk = MessageConverter.createStreamingChunk(
        request.model,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
      res.write(MessageConverter.formatSSE(errorChunk));
      res.write(MessageConverter.createSSEDone());
    }

    res.end();
  }

  /**
   * Get workflow session info
   */
  getWorkflowSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  /**
   * List all workflow sessions
   */
  listWorkflowSessions() {
    return Array.from(this.sessions.values());
  }
}
