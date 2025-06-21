// Example configuration for different environments
// Note: In browser environments, you'll need to pass these values directly
declare const process: any;

export const configs = {
  development: {
    coze: {
      baseURL: 'https://api.coze.com',
      // Set these via environment variables
      apiKey: process.env.COZE_API_KEY || '',
      botId: process.env.COZE_BOT_ID || '',
      workflowId: process.env.COZE_WORKFLOW_ID || '',
    },
  },
  production: {
    coze: {
      baseURL: 'https://api.coze.com',
      apiKey: process.env.COZE_API_KEY || '',
      botId: process.env.COZE_BOT_ID || '',
      workflowId: process.env.COZE_WORKFLOW_ID || '',
    },
  },
  china: {
    coze: {
      baseURL: 'https://api.coze.cn',
      apiKey: process.env.COZE_API_KEY_CN || '',
      botId: process.env.COZE_BOT_ID_CN || '',
      workflowId: process.env.COZE_WORKFLOW_ID_CN || '',
    },
  },
};

export function getConfig(env: keyof typeof configs = 'development') {
  return configs[env];
}
