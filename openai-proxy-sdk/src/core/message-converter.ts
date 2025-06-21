import { RoleType } from '@coze/api';
import { ChatMessage, ContentPart } from '../types';

export class MessageConverter {
  static openAIToCoze(messages: ChatMessage[]) {
    return messages.map(msg => {
      const role = this.convertRole(msg.role);

      if (typeof msg.content === 'string') {
        return {
          role,
          content: msg.content,
          content_type: 'text' as const,
        };
      } else {
        // Handle multimodal content
        const contentParts = Array.isArray(msg.content) ? msg.content : [msg.content];
        return {
          role,
          content: JSON.stringify(contentParts.map(part => ({
            type: part.type,
            text: part.text,
            file_url: part.file_url,
            file_id: part.file_id,
          }))),
          content_type: 'object_string' as const,
        };
      }
    });
  }

  static cozeToOpenAI(messages: any[]): ChatMessage[] {
    return messages.map(msg => {
      const role = this.convertRoleBack(msg.role);

      if (msg.content_type === 'text') {
        return {
          role,
          content: msg.content,
        };
      } else if (msg.content_type === 'object_string') {
        try {
          const contentParts = JSON.parse(msg.content) as ContentPart[];
          return {
            role,
            content: contentParts,
          };
        } catch {
          return {
            role,
            content: msg.content,
          };
        }
      }

      return {
        role,
        content: msg.content,
      };
    });
  }

  private static convertRole(role: string): RoleType {
    switch (role) {
      case 'system':
        return RoleType.Assistant; // Coze doesn't have system role, use assistant
      case 'user':
        return RoleType.User;
      case 'assistant':
        return RoleType.Assistant;
      default:
        return RoleType.User;
    }
  }

  private static convertRoleBack(role: RoleType): 'system' | 'user' | 'assistant' {
    switch (role) {
      case RoleType.User:
        return 'user';
      case RoleType.Assistant:
        return 'assistant';
      default:
        return 'assistant';
    }
  }

  static createSystemMessage(content: string): ChatMessage {
    return {
      role: 'system',
      content,
    };
  }

  static createUserMessage(content: string | ContentPart[]): ChatMessage {
    return {
      role: 'user',
      content,
    };
  }

  static createAssistantMessage(content: string): ChatMessage {
    return {
      role: 'assistant',
      content,
    };
  }
}
