import { OpenAIProxySDK } from '../src/index';

async function workflowExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'workflow-model',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
      workflowId: process.env.COZE_WORKFLOW_ID || 'your-workflow-id',
    },
    modelType: 'workflow',
    workflow: {
      workflowId: process.env.COZE_WORKFLOW_ID || 'your-workflow-id',
      parameters: {
        input: 'Hello World',
      },
      isAsync: false,
    },
  });

  try {
    // Run workflow synchronously
    console.log('=== Running Sync Workflow ===');
    const result = await sdk.runWorkflow({
      input: 'JavaScript programming',
      temperature: 0.7,
    });
    console.log('Workflow result:', result);

    // Run workflow with streaming
    console.log('\n=== Running Streaming Workflow ===');
    const stream = sdk.runWorkflowStream({
      input: 'Python programming',
    });

    for await (const event of stream) {
      if (event.type === 'event') {
        console.log('Event:', event.data.event);
        console.log('Data:', event.data.data);
      } else if (event.type === 'interrupt') {
        console.log('Interrupt received:', event.data);
        // Handle interrupt - you might want to resume with some data
        // await sdk.resumeWorkflow(
        //   event.data.interrupt_data.event_id,
        //   'Resume with this data',
        //   event.data.interrupt_data.type
        // );
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function asyncWorkflowExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'workflow-model',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'workflow',
    workflow: {
      workflowId: process.env.COZE_WORKFLOW_ID || 'your-workflow-id',
      parameters: {
        input: 'Async processing',
      },
      isAsync: true,
    },
  });

  try {
    console.log('=== Running Async Workflow ===');
    const result = await sdk.runWorkflow({
      input: 'Long running task',
    });

    console.log('Async workflow started:', result.execute_id);

    // Poll for completion
    console.log('Polling for completion...');
    const finalResult = await sdk.getWorkflowHistory(result.execute_id);
    console.log('Final result:', finalResult);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function workflowChatExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'workflow-chat',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'workflow',
    workflow: {
      workflowId: process.env.COZE_WORKFLOW_ID || 'your-workflow-id',
      parameters: {},
    },
  });

  try {
    console.log('=== Workflow Chat Mode ===');

    // Use OpenAI-compatible chat interface with workflow backend
    const response = await sdk.createChatCompletion({
      model: 'workflow-chat',
      messages: [
        { role: 'user', content: 'Process this request through workflow' },
      ],
    });

    console.log('Workflow chat response:', response.choices[0].message.content);
    console.log('Usage:', response.usage);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function workflowConfigurationExample() {
  const sdk = new OpenAIProxySDK({
    apiKey: 'your-openai-key',
    model: 'workflow-model',
    coze: {
      apiKey: process.env.COZE_API_KEY || 'your-coze-api-key',
      baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
      botId: process.env.COZE_BOT_ID || 'your-bot-id',
    },
    modelType: 'workflow',
    workflow: {
      workflowId: process.env.COZE_WORKFLOW_ID || 'your-workflow-id',
      parameters: {
        defaultParam: 'default value',
      },
    },
  });

  try {
    console.log('=== Dynamic Configuration ===');

    // Update workflow configuration
    sdk.updateWorkflowConfig({
      parameters: {
        newParam: 'new value',
        temperature: 0.9,
      },
      isAsync: true,
    });

    // Update Coze configuration
    sdk.updateCozeConfig({
      baseURL: 'https://api.coze.cn', // Switch to different region
      debug: true,
    });

    const result = await sdk.runWorkflow({
      runtimeParam: 'runtime value',
    });

    console.log('Updated workflow result:', result);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  await workflowExample();
  await asyncWorkflowExample();
  await workflowChatExample();
  await workflowConfigurationExample();
}

if (require.main === module) {
  main().catch(console.error);
}
