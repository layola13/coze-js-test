import OpenAI from 'openai';

// Test the proxy server with standard OpenAI SDK
async function testChatCompletion() {
  console.log('🧪 Testing Chat Completion...');

  // Create OpenAI client pointing to our proxy server
  const openai = new OpenAI({
    apiKey: 'proxy-key', // This can be any string since we're using Coze
    baseURL: 'http://localhost:3000/v1', // Point to our proxy server
  });

  try {
    // Test non-streaming chat
    console.log('📝 Non-streaming chat...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello! Can you tell me a joke?' },
      ],
      // Custom headers to specify model type
      // @ts-ignore - Adding custom headers
      'x-model-type': 'chat',
    });

    console.log('✅ Non-streaming response:');
    console.log(response.choices[0].message.content);
    console.log('📊 Usage:', response.usage);

  } catch (error) {
    console.error('❌ Error in non-streaming chat:', error);
  }

  try {
    // Test streaming chat
    console.log('\n🌊 Streaming chat...');
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Tell me a short story about a robot.' },
      ],
      stream: true,
      // @ts-ignore - Adding custom headers
      'x-model-type': 'chat',
    });

    console.log('✅ Streaming response:');
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    console.log('\n');

  } catch (error) {
    console.error('❌ Error in streaming chat:', error);
  }
}

async function testConversationCompletion() {
  console.log('\n💬 Testing Conversation Completion...');

  const openai = new OpenAI({
    apiKey: 'proxy-key',
    baseURL: 'http://localhost:3000/v1',
  });

  try {
    // Test conversation with multiple messages
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'What about Italy?' },
      ],
      // @ts-ignore - Adding custom headers
      'x-model-type': 'conversation',
    });

    console.log('✅ Conversation response:');
    console.log(response.choices[0].message.content);

  } catch (error) {
    console.error('❌ Error in conversation:', error);
  }
}

async function testWorkflowCompletion() {
  console.log('\n⚡ Testing Workflow Completion...');

  const openai = new OpenAI({
    apiKey: 'proxy-key',
    baseURL: 'http://localhost:3000/v1',
  });

  try {
    // Test workflow execution
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Process this data: JavaScript programming' },
      ],
      // @ts-ignore - Adding custom headers
      'x-model-type': 'workflow',
    });

    console.log('✅ Workflow response:');
    console.log(response.choices[0].message.content);

  } catch (error) {
    console.error('❌ Error in workflow:', error);
  }
}

async function testMultimodalChat() {
  console.log('\n🖼️  Testing Multimodal Chat...');

  const openai = new OpenAI({
    apiKey: 'proxy-key',
    baseURL: 'http://localhost:3000/v1',
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image?' },
            {
              type: 'image_url',
              image_url: {
                url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
              }
            },
          ],
        },
      ],
      // @ts-ignore - Adding custom headers
      'x-model-type': 'chat',
    });

    console.log('✅ Multimodal response:');
    console.log(response.choices[0].message.content);

  } catch (error) {
    console.error('❌ Error in multimodal chat:', error);
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');

  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log('✅ Health check:', data);
  } catch (error) {
    console.error('❌ Error in health check:', error);
  }
}

async function testModels() {
  console.log('\n📋 Testing Models Endpoint...');

  const openai = new OpenAI({
    apiKey: 'proxy-key',
    baseURL: 'http://localhost:3000/v1',
  });

  try {
    const models = await openai.models.list();
    console.log('✅ Available models:');
    models.data.forEach(model => {
      console.log(`  - ${model.id} (owned by: ${model.owned_by})`);
    });
  } catch (error) {
    console.error('❌ Error listing models:', error);
  }
}

async function main() {
  console.log('🚀 Starting OpenAI Proxy Server Tests');
  console.log('Make sure the proxy server is running on http://localhost:3000\n');

  await testHealthCheck();
  await testModels();
  await testChatCompletion();
  await testConversationCompletion();
  await testWorkflowCompletion();
  await testMultimodalChat();

  console.log('\n✨ All tests completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runTests };
