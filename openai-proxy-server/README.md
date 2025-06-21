# OpenAI Proxy Server for Coze

A complete OpenAI-compatible REST API proxy server that routes requests to Coze services. This allows you to use the **standard OpenAI SDK** with Coze backends for chat, conversation, and workflow functionality.

## 🎯 The Goal

Use the standard OpenAI SDK **without any modifications**, just change the `baseURL`:

```typescript
import OpenAI from 'openai';

// Instead of OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // baseURL: 'https://api.openai.com/v1' // Default
});

// Use with Coze via our proxy
const openai = new OpenAI({
  apiKey: 'any-string', // Not used by proxy
  baseURL: 'http://localhost:3000/v1' // Our proxy server
});

// Same API, same code, different backend!
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Features

- 🚀 **100% OpenAI Compatible**: Use the standard OpenAI SDK without modifications
- 🔄 **Multiple Model Types**: Support for Chat, Conversation, and Workflow
- 📡 **Streaming Support**: Real-time streaming for chat and workflow
- � **JWT Authentication**: Support for OAuth JWT authentication with automatic token refresh
- �🛠 **TypeScript**: Full type safety and IntelliSense support
- ⚙️ **REST API**: Standard REST endpoints following OpenAI specifications
- 🔌 **Headers-based Routing**: Control model types via HTTP headers
- 🔒 **Production Ready**: CORS, security headers, error handling

## Architecture

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐    Coze API    ┌─────────────────┐
│   OpenAI SDK    │ ──────────────> │  Proxy Server   │ ──────────────> │   Coze Service  │
│   (Standard)    │    /v1/chat/    │   (This repo)   │                 │                 │
│                 │   completions   │                 │                 │                 │
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

Edit `.env` with your Coze credentials. You can choose between two authentication methods:

#### Option 1: API Key Authentication (Legacy)
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

#### Option 2: JWT Authentication (Recommended)
```bash
# JWT Authentication Configuration
COZE_JWT_APP_ID=your_jwt_app_id
COZE_JWT_KEY_ID=your_jwt_key_id
COZE_JWT_AUD=api.coze.com
COZE_JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key content\n-----END PRIVATE KEY-----
COZE_JWT_SESSION_NAME=openai-proxy

# Coze Configuration
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your-bot-id
COZE_WORKFLOW_ID=your-workflow-id

# Server Configuration
PORT=3000
DEFAULT_MODEL_TYPE=chat
```

> **Note**: If `COZE_JWT_APP_ID` is provided, JWT authentication will be used automatically instead of the API key. JWT tokens are automatically refreshed when they expire.
>
> **📋 For detailed JWT setup instructions, see [JWT-SETUP.md](./JWT-SETUP.md)**

### 3. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will start on `http://localhost:3000`

### 4. Use with Standard OpenAI SDK

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

All standard OpenAI API endpoints are supported:

- `POST /v1/chat/completions` - Chat completions (streaming & non-streaming)
- `GET /v1/models` - List available models
- `GET /health` - Health check (additional endpoint)

### JWT Authentication Endpoints

When using JWT authentication, these additional endpoints are available:

- `GET /get_jwt` - Get current JWT token (creates new one if needed)
- `POST /refresh_jwt` - Force refresh JWT token
- `DELETE /clear_jwt` - Clear current JWT token

#### JWT Endpoint Examples

```bash
# Get current JWT token
curl http://localhost:3000/get_jwt

# Response
{
  "success": true,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "info": {
    "hasToken": true,
    "isValid": true,
    "expiresIn": 3600
  }
}

# Force refresh token
curl -X POST http://localhost:3000/refresh_jwt

# Clear token (force refresh on next request)
curl -X DELETE http://localhost:3000/clear_jwt
```

### Request Format

The proxy accepts standard OpenAI API requests. Control the backend behavior using HTTP headers:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  // Use extra_headers to control proxy behavior
  extra_headers: {
    'x-model-type': 'chat',        // 'chat' | 'conversation' | 'workflow'
    'x-bot-id': 'specific-bot-id', // Override default bot
    'x-workflow-id': 'workflow-id' // Override default workflow
  }
});
```

## Model Types & Routing

### 1. Chat Model (Default)
Direct chat completions using Coze chat API.

```typescript
const openai = new OpenAI({
  apiKey: 'any-string',
  baseURL: 'http://localhost:3000/v1'
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  extra_headers: {
    'x-model-type': 'chat',
    // 'x-bot-id': 'your-specific-bot-id', // Optional override
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
  extra_headers: {
    'x-model-type': 'conversation',
    // 'x-conversation-id': 'existing-conversation-id', // Optional
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
  extra_headers: {
    'x-model-type': 'workflow',
    // 'x-workflow-id': 'your-workflow-id', // Optional override
  }
});
```

## Streaming Support

Streaming works exactly like OpenAI:

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
  extra_headers: {
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

- `openai-standard-usage.ts` - Complete OpenAI SDK examples
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
  apiKey: 'any-string', // Any string works
  baseURL: 'http://localhost:3000/v1', // Your proxy server
});

// Exactly the same API calls!
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // Mapped to Coze
  messages: [{ role: 'user', content: 'Hello' }],
});
```

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
