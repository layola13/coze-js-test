import { v4 as uuidv4 } from 'uuid';
import { RoleType } from '@coze/api';
import type {
  OpenAIMessage,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionStreamResponse,
  CozeMessageContent
} from './types';

export class MessageConverter {
  /**
   * Convert OpenAI message to Coze message format
   */
  static openAIToCoze(message: OpenAIMessage): {
    role: RoleType;
    content: string;
    content_type: 'text' | 'object_string';
  } {
    // Handle role mapping
    let role: RoleType;
    switch (message.role) {
      case 'system':
      case 'assistant':
        role = RoleType.Assistant;
        break;
      case 'user':
        role = RoleType.User;
        break;
      default:
        role = RoleType.User;
    }

    // Handle content conversion
    if (typeof message.content === 'string') {
      return {
        role,
        content: message.content,
        content_type: 'text',
      };
    }

    // Handle multimodal content
    if (Array.isArray(message.content)) {
      const cozeContent: CozeMessageContent[] = message.content.map(item => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text || '' };
        } else if (item.type === 'image' || item.type === 'image_url') {
          return {
            type: 'image',
            file_url: item.image_url?.url || item.file_url || ''
          };
        }
        return { type: 'text', text: '' };
      });

      return {
        role,
        content: JSON.stringify(cozeContent),
        content_type: 'object_string',
      };
    }

    return {
      role,
      content: String(message.content),
      content_type: 'text',
    };
  }

  /**
   * Convert Coze message to OpenAI message format
   */
  static cozeToOpenAI(message: any): OpenAIMessage {
    let role: 'system' | 'user' | 'assistant';

    switch (message.role) {
      case RoleType.Assistant:
        role = 'assistant';
        break;
      case RoleType.User:
        role = 'user';
        break;
      default:
        role = 'user';
    }

    // Handle different content types
    if (message.content_type === 'object_string') {
      try {
        const parsedContent = JSON.parse(message.content);
        if (Array.isArray(parsedContent)) {
          const openAIContent = parsedContent.map((item: CozeMessageContent) => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text };
            } else if (item.type === 'image') {
              return { type: 'image_url', image_url: { url: item.file_url } };
            }
            return { type: 'text', text: '' };
          });
          return { role, content: openAIContent };
        }
      } catch (e) {
        // Fallback to text if parsing fails
      }
    }

    return {
      role,
      content: message.content || '',
    };
  }

  /**
   * Create OpenAI chat completion response
   */
  static createChatCompletionResponse(
    model: string,
    content: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): OpenAIChatCompletionResponse {
    return {
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
        },
      ],
      usage,
    };
  }

  /**
   * Create OpenAI streaming response chunk
   */
  static createStreamingChunk(
    model: string,
    content: string,
    isLast: boolean = false
  ): OpenAIChatCompletionStreamResponse {
    return {
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: isLast ? {} : { content },
          finish_reason: isLast ? 'stop' : null,
        },
      ],
    };
  }

  /**
   * Format Server-Sent Events data
   */
  static formatSSE(data: any): string {
    return `data: ${JSON.stringify(data)}\n\n`;
  }

  /**
   * Create SSE done message
   */
  static createSSEDone(): string {
    return 'data: [DONE]\n\n';
  }
}
