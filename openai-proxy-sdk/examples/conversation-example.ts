import { OpenAIProxySDK } from '../src/index';

async function conversationExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'gpt-3.5-turbo',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'conversation',
    conversation: {
      autoSaveHistory: true,
      metaData: {
        session: 'example-session',
        user: 'demo-user',
      },
    },
  });

  try {
    // Create a new conversation
    console.log('=== Creating Conversation ===');
    const conversation = await sdk.createConversation([
      {
        role: 'assistant',
        content: 'Hi! I am your assistant. How can I help you today?',
      },
    ]);
    console.log('Conversation created:', conversation.id);

    // Add a user message
    console.log('\n=== Adding User Message ===');
    const userMessage = await sdk.addMessage('What is the weather like today?', 'user');
    console.log('User message added:', userMessage.id);

    // Add an assistant response
    console.log('\n=== Adding Assistant Response ===');
    const assistantMessage = await sdk.addMessage(
      'I don\'t have access to real-time weather data, but I can help you with general weather information.',
      'assistant'
    );
    console.log('Assistant message added:', assistantMessage.id);

    // Get all messages in conversation
    console.log('\n=== Getting All Messages ===');
    const messages = await sdk.getMessages();
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}]: ${msg.content}`);
    });

    // Update a message
    console.log('\n=== Updating Message ===');
    const updatedMessage = await sdk.updateMessage(
      assistantMessage.id,
      'I don\'t have access to real-time weather data, but I recommend checking a weather app or website for current conditions.',
      { updated: true, timestamp: new Date().toISOString() }
    );
    console.log('Message updated:', updatedMessage.id);

    // Add multimodal message
    console.log('\n=== Adding Multimodal Message ===');
    const multimodalMessage = await sdk.addMessage([
      { type: 'text', text: 'Here is an image:' },
      {
        type: 'image',
        file_url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
      },
    ], 'user');
    console.log('Multimodal message added:', multimodalMessage.id);

    // Final message list
    console.log('\n=== Final Message List ===');
    const finalMessages = await sdk.getMessages();
    finalMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}]: ${typeof msg.content === 'string' ? msg.content : 'Multimodal content'}`);
    });

    // Clear conversation (optional)
    // await sdk.clearConversation();
    // console.log('Conversation cleared');

  } catch (error) {
    console.error('Error:', error);
  }
}

async function conversationManagementExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'gpt-3.5-turbo',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'conversation',
  });

  try {
    // Create multiple conversations
    console.log('=== Creating Multiple Conversations ===');

    const conv1 = await sdk.createConversation();
    console.log('Conversation 1:', conv1.id);

    // Switch to a different conversation by updating config
    sdk.updateConversationConfig({
      conversationId: undefined, // Reset to create new
      metaData: { session: 'session-2' }
    });

    const conv2 = await sdk.createConversation();
    console.log('Conversation 2:', conv2.id);

    // List all conversations (if supported)
    // Note: This might require bot_id to be set
    // const conversations = await sdk.listConversations();
    // console.log('All conversations:', conversations);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  await conversationExample();
  await conversationManagementExample();
}

if (require.main === module) {
  main().catch(console.error);
}
