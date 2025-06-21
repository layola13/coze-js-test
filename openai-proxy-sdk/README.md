# OpenAI Proxy Server for Coze

A complete OpenAI-compatible REST API proxy server that routes requests to Coze services. This allows you to use the standard OpenAI SDK with Coze backends for chat, conversation, and workflow functionality.

## Features

- 🚀 **100% OpenAI Compatible**: Use the standard OpenAI SDK without modifications
- 🔄 **Multiple Model Types**: Support for Chat, Conversation, and Workflow
- 📡 **Streaming Support**: Real-time streaming for chat and workflow
- 🛠 **TypeScript**: Full type safety and IntelliSense support
- ⚙️ **REST API**: Standard REST endpoints following OpenAI specifications
- 🔌 **Headers-based Routing**: Control model types via HTTP headers
- � **Production Ready**: CORS, security headers, error handling

## Architecture

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    Coze API    ┌─────────────────┐
│   OpenAI SDK    │ ──────────────> │  Proxy Server   │ ──────────────> │   Coze Service  │
│   (Standard)    │                 │   (This repo)   │                 │                 │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## Quick Start

### 1. Installation & Setup

```bash
git clone <this-repo>
cd openai-proxy-server
npm install
```

### 2. Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your Coze credentials:
```bash
# Coze API Configuration
COZE_API_KEY=your-coze-api-key
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your-bot-id
COZE_WORKFLOW_ID=your-workflow-id

# Server Configuration
PORT=3000
DEFAULT_MODEL_TYPE=chat
```

### 3. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will start on `http://localhost:3000`

### 4. Use with OpenAI SDK

```typescript
import OpenAI from 'openai';

// Create OpenAI client pointing to your proxy server
const openai = new OpenAI({
  apiKey: 'any-string', // Not used, but required by OpenAI SDK
  baseURL: 'http://localhost:3000/v1', // Your proxy server
});

// Use exactly like OpenAI!
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello, world!' },
  ],
});

console.log(response.choices[0].message.content);
```

## API Endpoints

### Standard OpenAI Endpoints

- `POST /v1/chat/completions` - Chat completions (streaming & non-streaming)
- `GET /v1/models` - List available models
- `GET /health` - Health check

### Additional Management Endpoints

- `GET /v1/conversations` - List conversations
- `GET /v1/conversations/{id}/history` - Get conversation history
- `DELETE /v1/conversations/{id}` - Clear conversation
- `GET /v1/workflows/sessions` - List workflow sessions
- `GET /v1/workflows/sessions/{id}` - Get workflow session info

## Model Types & Routing

Control the backend behavior using HTTP headers:

### 1. Chat Model (Default)
Direct chat completions using Coze chat API.

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
}, {
  headers: {
    'x-model-type': 'chat',
    'x-bot-id': 'your-specific-bot-id', // Optional override
  }
});
```

### 2. Conversation Model
Persistent conversations with message history.

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'What is AI?' },
    { role: 'assistant', content: 'AI is...' },
    { role: 'user', content: 'Tell me more.' },
  ],
}, {
  headers: {
    'x-model-type': 'conversation',
    'x-conversation-id': 'existing-conversation-id', // Optional
  }
});
```

### 3. Workflow Model
Execute Coze workflows.

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Process this data: JavaScript' },
  ],
}, {
  headers: {
    'x-model-type': 'workflow',
    'x-workflow-id': 'your-workflow-id', // Optional override
  }
});
```

## Streaming Support

```typescript
// Streaming works exactly like OpenAI
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
}, {
  headers: {
    'x-model-type': 'chat',
  }
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

## Multimodal Support

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4-vision-preview',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        {
          type: 'image_url',
          image_url: { url: 'https://example.com/image.jpg' }
        },
      ],
    },
  ],
});
```
  ## Raw HTTP Examples

You can also make direct HTTP requests:

```bash
# Chat completion
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-model-type: chat" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# Streaming chat
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-model-type: chat" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'

# Workflow execution
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-model-type: workflow" \
  -H "x-workflow-id: your-workflow-id" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Process this data"}
    ]
  }'
```

## Configuration

### Environment Variables

```bash
# Required
COZE_API_KEY=your-coze-api-key
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your-default-bot-id

# Optional
COZE_WORKFLOW_ID=your-default-workflow-id
COZE_SPACE_ID=your-space-id
PORT=3000
DEFAULT_MODEL_TYPE=chat
ENABLE_CORS=true
ENABLE_LOGGING=true
```

### Runtime Configuration

You can override defaults using HTTP headers:

| Header | Description | Example |
|--------|-------------|---------|
| `x-model-type` | Model type to use | `chat`, `conversation`, `workflow` |
| `x-bot-id` | Override default bot ID | `bot_123456` |
| `x-workflow-id` | Override default workflow ID | `workflow_789` |
| `x-conversation-id` | Use existing conversation | `conv_abc123` |

## Testing

Start the server:
```bash
npm run dev
```

Run tests:
```bash
# Test with OpenAI SDK
npm run test

# Test with raw HTTP
npm run test:raw
```

## Examples

The `examples/` directory contains:

- `test-client.ts` - Complete OpenAI SDK examples
- `raw-http-test.ts` - Raw HTTP request examples

## Error Handling

The proxy returns OpenAI-compatible error responses:

```json
{
  "error": {
    "message": "Bot ID is required for chat completion",
    "type": "invalid_request_error",
    "code": "missing_bot_id"
  }
}
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Build & Deploy

```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm start
```

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
PORT=3000
COZE_API_KEY=your-production-coze-key
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your-production-bot-id

# Security
ENABLE_CORS=true
ALLOWED_ORIGINS=https://your-frontend.com
```

## Migration from Direct OpenAI

### Before (Direct OpenAI)
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### After (Via Proxy)
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'proxy-key', // Any string
  baseURL: 'http://localhost:3000/v1', // Your proxy server
});

// Exactly the same API calls!
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // Mapped to Coze
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## API Reference

### Chat Completions

`POST /v1/chat/completions`

Standard OpenAI chat completions endpoint with additional headers for routing.

**Request Headers:**
- `x-model-type`: `chat` | `conversation` | `workflow`
- `x-bot-id`: Override default bot ID
- `x-workflow-id`: Override default workflow ID
- `x-conversation-id`: Use existing conversation

**Request Body:**
Standard OpenAI chat completion request format.

**Response:**
Standard OpenAI chat completion response format.

### Models

`GET /v1/models`

Returns list of available models (OpenAI compatible).

### Health Check

`GET /health`

Returns server health status and configuration info.

## Development

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm run test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- 📖 Documentation: This README
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

## Model Types

### 1. Chat Model

Direct chat completions similar to OpenAI's chat API.

```typescript
const chatSDK = new OpenAIProxySDK({
  apiKey: 'your-key',
  coze: {
    apiKey: 'coze-key',
    baseURL: 'https://api.coze.com',
    botId: 'bot-id',
  },
  modelType: 'chat',
});
```

### 2. Conversation Model

Persistent conversations with message management.

```typescript
const conversationSDK = new OpenAIProxySDK({
  apiKey: 'your-key',
  coze: {
    apiKey: 'coze-key',
    baseURL: 'https://api.coze.com',
    botId: 'bot-id',
  },
  modelType: 'conversation',
  conversation: {
    autoSaveHistory: true,
    metaData: { session: 'user-session' },
  },
});

// Create conversation
await conversationSDK.createConversation();

// Add messages
await conversationSDK.addMessage('Hello!', 'user');
await conversationSDK.addMessage('Hi there!', 'assistant');

// Get all messages
const messages = await conversationSDK.getMessages();
```

### 3. Workflow Model

Execute Coze workflows with OpenAI-compatible interface.

```typescript
const workflowSDK = new OpenAIProxySDK({
  apiKey: 'your-key',
  coze: {
    apiKey: 'coze-key',
    baseURL: 'https://api.coze.com',
    botId: 'bot-id',
  },
  modelType: 'workflow',
  workflow: {
    workflowId: 'workflow-id',
    parameters: { input: 'default-input' },
    isAsync: false,
  },
});

// Run workflow
const result = await workflowSDK.runWorkflow({
  input: 'Process this data',
});

// Stream workflow
for await (const event of workflowSDK.runWorkflowStream()) {
  console.log(event);
}
```

## Advanced Usage

### Multimodal Support

```typescript
const response = await sdk.createChatCompletion({
  model: 'gpt-4-vision-preview',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see?' },
        { type: 'image', file_url: 'https://example.com/image.jpg' },
      ],
    },
  ],
});
```

### Dynamic Configuration

```typescript
// Update Coze configuration
sdk.updateCozeConfig({
  baseURL: 'https://api.coze.cn', // Switch region
  botId: 'new-bot-id',
});

// Switch model types
sdk.switchModelType('workflow', {
  workflow: {
    workflowId: 'new-workflow-id',
    parameters: { param: 'value' },
  },
});
```

### Environment Variables

```bash
# Coze Configuration
COZE_API_KEY=your-coze-api-key
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your-bot-id
COZE_WORKFLOW_ID=your-workflow-id

# Optional
COZE_SPACE_ID=your-space-id
COZE_BASE_WS_URL=wss://api.coze.com
```

## API Reference

### OpenAIProxySDK

#### Constructor

```typescript
new OpenAIProxySDK(config: ProxyConfig)
```

#### Methods

- `createChatCompletion(request)` - Create chat completion
- `createChatCompletionStream(request)` - Create streaming chat completion
- `createConversation(messages?)` - Create new conversation
- `addMessage(content, role)` - Add message to conversation
- `getMessages()` - Get all conversation messages
- `runWorkflow(parameters)` - Execute workflow
- `runWorkflowStream(parameters)` - Execute workflow with streaming
- `updateCozeConfig(updates)` - Update Coze configuration
- `switchModelType(type, config?)` - Switch between model types

### Configuration Types

```typescript
interface ProxyConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  coze: CozeConfig;
  modelType: 'chat' | 'conversation' | 'workflow';
  conversation?: ConversationConfig;
  workflow?: WorkflowConfig;
}

interface CozeConfig {
  apiKey: string;
  baseURL?: string;
  baseWsURL?: string;
  botId?: string;
  workflowId?: string;
  spaceId?: string;
  debug?: boolean;
}
```

## Examples

See the `examples/` directory for complete examples:

- `chat-example.ts` - Basic and multimodal chat
- `conversation-example.ts` - Conversation management
- `workflow-example.ts` - Workflow execution

Run examples:

```bash
npm run example:chat
npm run example:conversation
npm run example:workflow
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run examples
npm run example:chat
```

## Error Handling

```typescript
try {
  const response = await sdk.createChatCompletion(request);
} catch (error) {
  if (error.message.includes('Bot ID is required')) {
    // Handle missing bot ID
  } else if (error.message.includes('Workflow ID is required')) {
    // Handle missing workflow ID
  } else {
    // Handle other errors
  }
}
```

## Migration from OpenAI SDK

This SDK is designed to be a drop-in replacement for OpenAI SDK:

```typescript
// Before (OpenAI SDK)
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: 'sk-...' });

// After (This SDK)
import { OpenAIProxySDK } from 'openai-proxy-sdk';
const sdk = new OpenAIProxySDK({
  apiKey: 'sk-...', // Keep your OpenAI key for compatibility
  coze: {
    apiKey: 'your-coze-key',
    baseURL: 'https://api.coze.com',
    botId: 'your-bot-id',
  },
  modelType: 'chat',
});

// Same API calls work!
const response = await sdk.createChatCompletion({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
