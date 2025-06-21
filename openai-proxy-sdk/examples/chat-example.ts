import { OpenAIProxySDK } from '../src/index';

async function chatExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key', // Compatible with OpenAI SDK
    model: 'gpt-3.5-turbo',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'chat',
  });

  try {
    // Non-streaming chat
    console.log('=== Non-streaming Chat ===');
    const response = await sdk.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Tell me a joke' },
      ],
      max_tokens: 150,
    });

    console.log('Response:', response.choices[0].message.content);
    console.log('Usage:', response.usage);

    // Streaming chat
    console.log('\n=== Streaming Chat ===');
    const stream = sdk.createChatCompletionStream({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Tell me another joke' },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    console.log('\n=== End of Streaming ===');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Multimodal example
async function multimodalExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'gpt-4-vision-preview',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'chat',
  });

  try {
    const response = await sdk.createChatCompletion({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image?' },
            {
              type: 'image',
              file_url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
            },
          ],
        },
      ],
    });

    console.log('Vision Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  await chatExample();
  await multimodalExample();
}

if (require.main === module) {
  main().catch(console.error);
}
