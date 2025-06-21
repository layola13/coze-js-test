// OpenAI API Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | Array<{
    type: 'text' | 'image' | 'image_url';
    text?: string;
    image_url?: { url: string };
    file_url?: string;
  }>;
  name?: string;
  function_call?: any;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  user?: string;
  functions?: any[];
  function_call?: any;
  // Custom headers for proxy routing
  'x-model-type'?: 'chat' | 'conversation' | 'workflow';
  'x-bot-id'?: string;
  'x-workflow-id'?: string;
  'x-conversation-id'?: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatCompletionStreamResponse {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<OpenAIMessage>;
    finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  }>;
}

// Proxy Configuration Types
export interface ProxyConfig {
  coze: {
    apiKey?: string;
    baseURL?: string;
    baseWsURL?: string;
    botId?: string;
    workflowId?: string;
    spaceId?: string;
    // JWT 配置
    jwt?: {
      appId: string;
      keyId: string;
      aud: string;
      privateKey: string;
      sessionName?: string;
    };
  };
  defaultModelType: 'chat' | 'conversation' | 'workflow';
  port: number;
  cors: {
    enabled: boolean;
    origins: string | string[];
  };
  logging: {
    enabled: boolean;
  };
}

// JWT Token Response
export interface JWTTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Internal Types
export interface ConversationSession {
  id: string;
  conversationId?: string;
  messages: OpenAIMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowSession {
  id: string;
  workflowId: string;
  parameters: Record<string, any>;
  createdAt: number;
}

// Coze Mapping Types
export interface CozeMessageContent {
  type: 'text' | 'image' | 'file';
  text?: string;
  file_url?: string;
  file_id?: string;
}
