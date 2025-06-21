import axios from 'axios';

// Example showing raw HTTP requests to the proxy server
async function testRawHTTP() {
  const baseURL = 'http://localhost:3000';

  console.log('🔌 Testing Raw HTTP Requests...');

  try {
    // Test health check
    console.log('\n🏥 Health Check:');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log(healthResponse.data);

    // Test chat completion
    console.log('\n💬 Chat Completion:');
    const chatResponse = await axios.post(`${baseURL}/v1/chat/completions`, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-model-type': 'chat'
      }
    });
    console.log(chatResponse.data);

    // Test conversation with custom bot ID
    console.log('\n💭 Conversation with Custom Bot ID:');
    const conversationResponse = await axios.post(`${baseURL}/v1/chat/completions`, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'What is TypeScript?' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-model-type': 'conversation',
        'x-bot-id': 'custom-bot-id-123'
      }
    });
    console.log(conversationResponse.data);

    // Test workflow with custom workflow ID
    console.log('\n⚡ Workflow with Custom Workflow ID:');
    const workflowResponse = await axios.post(`${baseURL}/v1/chat/completions`, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Process: Hello World' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-model-type': 'workflow',
        'x-workflow-id': 'custom-workflow-id-456'
      }
    });
    console.log(workflowResponse.data);

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Example of streaming with curl-like approach
async function testStreaming() {
  console.log('\n🌊 Testing Streaming...');

  try {
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-model-type': 'chat',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Tell me a short story' }
        ],
        stream: true
      })
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('📡 Streaming response:');

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('\n✅ Stream completed');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              process.stdout.write(content);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Streaming error:', error);
  }
}

async function main() {
  console.log('🔧 Testing OpenAI Proxy Server with Raw HTTP');
  console.log('Make sure the server is running on http://localhost:3000\n');

  await testRawHTTP();
  await testStreaming();

  console.log('\n✨ Raw HTTP tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}
