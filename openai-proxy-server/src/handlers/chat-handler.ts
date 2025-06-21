import { CozeAPI, ChatEventType, ChatStatus } from '@coze/api';
import { Response } from 'express';
import { MessageConverter } from '../message-converter';
import type { OpenAIChatCompletionRequest, ProxyConfig } from '../types';

export class ChatHandler {
  private coze: CozeAPI;
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
    this.coze = new CozeAPI({
      token: config.coze.apiKey,
      baseURL: config.coze.baseURL,
    });
  }

  /**
   * Handle non-streaming chat completion
   */
  async handleChatCompletion(request: OpenAIChatCompletionRequest) {
    const botId = request['x-bot-id'] || this.config.coze.botId;
    if (!botId) {
      throw new Error('Bot ID is required for chat completion');
    }

    // Convert OpenAI messages to Coze format
    const cozeMessages = request.messages.map(msg =>
      MessageConverter.openAIToCoze(msg)
    );

    // Create chat with Coze
    const chatResponse = await this.coze.chat.createAndPoll({
      bot_id: botId,
      auto_save_history: false,
      additional_messages: cozeMessages,
    });

    if (chatResponse.chat.status === ChatStatus.COMPLETED) {
      // Find the assistant's response
      const assistantMessage = chatResponse.messages?.find(
        msg => msg.role === 'assistant' && msg.type === 'answer'
      );

      const content = assistantMessage?.content || '';

      // Calculate usage if available
      const usage = chatResponse.chat.usage ? {
        prompt_tokens: chatResponse.chat.usage.input_count || 0,
        completion_tokens: chatResponse.chat.usage.output_count || 0,
        total_tokens: chatResponse.chat.usage.token_count || 0,
      } : undefined;

      return MessageConverter.createChatCompletionResponse(
        request.model,
        content,
        usage
      );
    } else {
      throw new Error(`Chat completion failed with status: ${chatResponse.chat.status}`);
    }
  }

  /**
   * Handle streaming chat completion
   */
  async handleStreamingChatCompletion(
    request: OpenAIChatCompletionRequest,
    res: Response
  ) {
    const botId = request['x-bot-id'] || this.config.coze.botId;
    if (!botId) {
      throw new Error('Bot ID is required for streaming chat completion');
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    try {
      // Convert OpenAI messages to Coze format
      const cozeMessages = request.messages.map(msg =>
        MessageConverter.openAIToCoze(msg)
      );

      // Create streaming chat with Coze
      const stream = await this.coze.chat.stream({
        bot_id: botId,
        auto_save_history: false,
        additional_messages: cozeMessages,
      });

      let accumulatedContent = '';

      for await (const part of stream) {
        if (part.event === ChatEventType.CONVERSATION_CHAT_CREATED) {
          // Chat started - send initial chunk
          const chunk = MessageConverter.createStreamingChunk(request.model, '');
          res.write(MessageConverter.formatSSE(chunk));
        }
        else if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
          // Streaming content
          const content = part.data.content || '';
          accumulatedContent += content;

          const chunk = MessageConverter.createStreamingChunk(request.model, content);
          res.write(MessageConverter.formatSSE(chunk));
        }
        else if (part.event === ChatEventType.CONVERSATION_MESSAGE_COMPLETED) {
          // Message completed
          const { role, type } = part.data;
          if (role === 'assistant' && type === 'answer') {
            // This is the final answer - we can continue streaming
          }
        }
        else if (part.event === ChatEventType.CONVERSATION_CHAT_COMPLETED) {
          // Chat completed - send final chunk
          const finalChunk = MessageConverter.createStreamingChunk(
            request.model,
            '',
            true
          );
          res.write(MessageConverter.formatSSE(finalChunk));
          res.write(MessageConverter.createSSEDone());
          break;
        }
        else if (part.event === ChatEventType.ERROR) {
          // Error occurred
          throw new Error(`Chat error: ${part.data}`);
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
}
