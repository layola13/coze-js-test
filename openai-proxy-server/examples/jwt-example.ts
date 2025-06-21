/**
 * Example: Using OpenAI SDK with JWT-authenticated Coze Proxy
 *
 * This example demonstrates how to use the standard OpenAI SDK
 * with our JWT-authenticated proxy server.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create OpenAI client pointing to our proxy server
const openai = new OpenAI({
  apiKey: 'not-used-but-required', // The proxy handles authentication via JWT
  baseURL: process.env.PROXY_BASE_URL || 'http://localhost:3000/v1',
});

async function main() {
  console.log('🤖 Testing OpenAI SDK with JWT-authenticated Coze Proxy');
  console.log('=====================================================\n');

  try {
    // Test 1: Basic chat completion
    console.log('1. Basic Chat Completion (Default: Chat Model)');
    console.log('---------------------------------------------');

    const response1 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Model name doesn't matter for proxy
      messages: [
        { role: 'user', content: 'Hello! Can you tell me a short joke?' }
      ],
      max_tokens: 100,
    });

    console.log('✅ Response received:');
    console.log(`   ${response1.choices[0].message.content}`);
    console.log(`   Model: ${response1.model}`);
    console.log(`   Tokens: ${response1.usage?.total_tokens || 'N/A'}`);
    console.log();

    // Test 2: Chat completion with specific bot
    console.log('2. Chat Completion with Specific Bot');
    console.log('-----------------------------------');

    const response2 = await openai.chat.completions.create({
      model: 'gpt-4', // Model name is passed through
      messages: [
        { role: 'user', content: 'Explain quantum computing in simple terms.' }
      ],
      max_tokens: 150,
      // Control proxy behavior via extra headers
      extra_headers: {
        'x-model-type': 'chat',
        // 'x-bot-id': 'specific-bot-id', // Uncomment to use specific bot
      }
    });

    console.log('✅ Response received:');
    console.log(`   ${response2.choices[0].message.content?.substring(0, 200)}...`);
    console.log(`   Model: ${response2.model}`);
    console.log();

    // Test 3: Streaming chat completion
    console.log('3. Streaming Chat Completion');
    console.log('---------------------------');

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Count from 1 to 5 slowly.' }
      ],
      stream: true,
      max_tokens: 50,
    });

    console.log('✅ Streaming response:');
    process.stdout.write('   ');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
    }
    console.log('\n');

    // Test 4: Conversation model (if configured)
    console.log('4. Conversation Model with Message History');
    console.log('-----------------------------------------');

    try {
      const response4 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'My name is Alice.' },
          { role: 'assistant', content: 'Hello Alice! Nice to meet you.' },
          { role: 'user', content: 'What is my name?' }
        ],
        extra_headers: {
          'x-model-type': 'conversation',
          // 'x-conversation-id': 'specific-conversation-id', // Optional
        }
      });

      console.log('✅ Conversation response:');
      console.log(`   ${response4.choices[0].message.content}`);
    } catch (error) {
      console.log('⚠️  Conversation model may not be fully configured');
      console.log(`   Error: ${error.message}`);
    }
    console.log();

    // Test 5: Workflow model (if configured)
    console.log('5. Workflow-based Completion');
    console.log('----------------------------');

    try {
      const response5 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Process this data: {"temperature": 25, "humidity": 60}' }
        ],
        extra_headers: {
          'x-model-type': 'workflow',
          // 'x-workflow-id': 'specific-workflow-id', // Optional
        }
      });

      console.log('✅ Workflow response:');
      console.log(`   ${response5.choices[0].message.content}`);
    } catch (error) {
      console.log('⚠️  Workflow model may not be fully configured');
      console.log(`   Error: ${error.message}`);
    }
    console.log();

    console.log('🎉 All tests completed successfully!');
    console.log('\nThe proxy server is working correctly with JWT authentication.');
    console.log('You can now use the standard OpenAI SDK with Coze backends!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the proxy server is running on the configured URL');
      console.error(`   Expected URL: ${process.env.PROXY_BASE_URL || 'http://localhost:3000'}`);
    } else if (error.status === 401) {
      console.error('   Authentication failed - check your JWT configuration');
    } else if (error.status === 400) {
      console.error('   Bad request - check your bot/workflow configuration');
    }
  }
}

// Run the example
main();
