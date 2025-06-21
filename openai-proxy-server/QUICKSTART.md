# 🚀 Quick Start Guide

Follow these steps to get the OpenAI Proxy Server running:

## 1. Setup Environment

```bash
cd openai-proxy-server
cp .env.example .env
```

Edit `.env` file:
```bash
COZE_API_KEY=your-coze-api-key-here
COZE_BOT_ID=your-bot-id-here
COZE_WORKFLOW_ID=your-workflow-id-here  # Optional
```

## 2. Install & Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Server will start on `http://localhost:3000`

## 3. Test with Standard OpenAI SDK

Create a test file `test.js`:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'any-string-works',
  baseURL: 'http://localhost:3000/v1'
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello! Tell me a joke.' }
  ]
});

console.log(response.choices[0].message.content);
```

Run it:
```bash
node test.js
```

## 4. Use Different Model Types

### Chat (Default)
```javascript
// Uses Coze chat API directly
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Conversation
```javascript
// Maintains conversation history
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'My name is John' },
    { role: 'assistant', content: 'Nice to meet you, John!' },
    { role: 'user', content: 'What is my name?' }
  ],
  extra_headers: {
    'x-model-type': 'conversation'
  }
});
```

### Workflow
```javascript
// Executes Coze workflows
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Process this: JavaScript tutorial' }
  ],
  extra_headers: {
    'x-model-type': 'workflow'
  }
});
```

## 5. Streaming

```javascript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

## That's it! 🎉

You now have a fully functional OpenAI-compatible proxy server running with Coze backend. Use it exactly like you would use OpenAI's API!

## Need Help?

- Check the full README.md for detailed documentation
- Run the test examples: `npm run test`
- Check server health: `curl http://localhost:3000/health`
