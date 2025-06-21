import { ChatEventType, ChatStatus } from '@coze/api';
import { CozeClient } from './client';
import { MessageConverter } from './message-converter';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  CozeConfig,
} from '../types';

export class ChatHandler {
  private cozeClient: CozeClient;

  constructor(cozeConfig: CozeConfig) {
    this.cozeClient = new CozeClient(cozeConfig);
  }

  async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const botId = this.cozeClient.getConfig().botId;
    if (!botId) {
      throw new Error('Bot ID is required for chat completion');
    }

    const cozeMessages = MessageConverter.openAIToCoze(request.messages);

    const response = await this.cozeClient.getClient().chat.createAndPoll({
      bot_id: botId,
      additional_messages: cozeMessages,
      auto_save_history: false,
    });

    if (response.chat.status === ChatStatus.COMPLETED) {
      const messages = MessageConverter.cozeToOpenAI(response.messages || []);
      const lastMessage = messages.find(m => m.role === 'assistant');

      return {
        id: response.chat.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            message: lastMessage || { role: 'assistant', content: '' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: response.chat.usage?.prompt_tokens || 0,
          completion_tokens: response.chat.usage?.completion_tokens || 0,
          total_tokens: response.chat.usage?.total_tokens || 0,
        },
      };
    }

    throw new Error(`Chat completion failed with status: ${response.chat.status}`);
  }

  async *createChatCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk> {
    const botId = this.cozeClient.getConfig().botId;
    if (!botId) {
      throw new Error('Bot ID is required for chat completion');
    }

    const cozeMessages = MessageConverter.openAIToCoze(request.messages);

    const stream = await this.cozeClient.getClient().chat.stream({
      bot_id: botId,
      additional_messages: cozeMessages,
      auto_save_history: false,
    });

    let chatId = '';
    let index = 0;

    for await (const part of stream) {
      if (part.event === ChatEventType.CONVERSATION_CHAT_CREATED) {
        chatId = part.data.id;
      } else if (part.event === ChatEventType.CONVERSATION_MESSAGE_DELTA) {
        yield {
          id: chatId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [
            {
              index,
              delta: {
                content: part.data.content,
              },
            },
          ],
        };
      } else if (part.event === ChatEventType.CONVERSATION_MESSAGE_COMPLETED) {
        if (part.data.role === 'assistant' && part.data.type === 'answer') {
          yield {
            id: chatId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: request.model,
            choices: [
              {
                index,
                delta: {},
                finish_reason: 'stop',
              },
            ],
          };
        }
      } else if (part.event === ChatEventType.ERROR) {
        throw new Error(`Chat stream error: ${JSON.stringify(part.data)}`);
      }
    }
  }

  updateConfig(updates: Partial<CozeConfig>): void {
    this.cozeClient.updateConfig(updates);
  }
}
