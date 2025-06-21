// OpenAI-compatible types
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  model?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
  name?: string;
}

export interface ContentPart {
  type: 'text' | 'image' | 'file';
  text?: string;
  file_url?: string;
  file_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }[];
}

// Coze-specific types
export interface CozeConfig {
  apiKey: string;
  baseURL?: string;
  baseWsURL?: string;
  botId?: string;
  workflowId?: string;
  spaceId?: string;
  debug?: boolean;
}

export interface ConversationConfig {
  conversationId?: string;
  autoSaveHistory?: boolean;
  metaData?: Record<string, any>;
}

export interface WorkflowConfig {
  workflowId: string;
  parameters?: Record<string, any>;
  isAsync?: boolean;
}

export type ModelType = 'chat' | 'conversation' | 'workflow';

export interface ProxyConfig extends OpenAIConfig {
  coze: CozeConfig;
  modelType: ModelType;
  conversation?: ConversationConfig;
  workflow?: WorkflowConfig;
}
