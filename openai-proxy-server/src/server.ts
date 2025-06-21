import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { ChatHandler } from './handlers/chat-handler';
import { ConversationHandler } from './handlers/conversation-handler';
import { WorkflowHandler } from './handlers/workflow-handler';
import { JWTManager } from './jwt-manager';
import type { OpenAIChatCompletionRequest, ProxyConfig } from './types';

// Load environment variables
dotenv.config();

const config: ProxyConfig = {
  coze: {
    apiKey: process.env.COZE_API_KEY || '',
    baseURL: process.env.COZE_BASE_URL || 'https://api.coze.com',
    baseWsURL: process.env.COZE_BASE_WS_URL || 'wss://api.coze.com',
    botId: process.env.COZE_BOT_ID,
    workflowId: process.env.COZE_WORKFLOW_ID,
    spaceId: process.env.COZE_SPACE_ID,
    // JWT 配置
    jwt: process.env.COZE_JWT_APP_ID ? {
      appId: process.env.COZE_JWT_APP_ID,
      keyId: process.env.COZE_JWT_KEY_ID || '',
      aud: process.env.COZE_JWT_AUD || '',
      privateKey: process.env.COZE_JWT_PRIVATE_KEY || '',
      sessionName: process.env.COZE_JWT_SESSION_NAME || 'openai-proxy',
    } : undefined,
  },
  defaultModelType: (process.env.DEFAULT_MODEL_TYPE as any) || 'chat',
  port: parseInt(process.env.PORT || '3000'),
  cors: {
    enabled: process.env.ENABLE_CORS === 'true',
    origins: process.env.ALLOWED_ORIGINS || '*',
  },
  logging: {
    enabled: process.env.ENABLE_LOGGING === 'true',
  },
};

class OpenAIProxyServer {
  private app: express.Application;
  private chatHandler: ChatHandler;
  private conversationHandler: ConversationHandler;
  private workflowHandler: WorkflowHandler;
  private jwtManager: JWTManager;

  constructor() {
    this.app = express();
    this.jwtManager = new JWTManager(config);
    this.chatHandler = new ChatHandler(config, this.jwtManager);
    this.conversationHandler = new ConversationHandler(config, this.jwtManager);
    this.workflowHandler = new WorkflowHandler(config, this.jwtManager);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    if (config.cors.enabled) {
      this.app.use(cors({
        origin: config.cors.origins === '*' ? true : config.cors.origins,
        credentials: true,
      }));
    }

    // Logging middleware
    if (config.logging.enabled) {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      const jwtInfo = this.jwtManager.getTokenInfo();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
          hasCozeApiKey: !!config.coze.apiKey,
          hasJWTConfig: !!config.coze.jwt,
          defaultModelType: config.defaultModelType,
          hasBotId: !!config.coze.botId,
          hasWorkflowId: !!config.coze.workflowId,
        },
        jwt: jwtInfo,
      });
    });

    // JWT Token endpoints
    this.app.get('/get_jwt', this.handleGetJWT.bind(this));
    this.app.post('/refresh_jwt', this.handleRefreshJWT.bind(this));
    this.app.delete('/clear_jwt', this.handleClearJWT.bind(this));

    // OpenAI compatible endpoints
    this.app.post('/v1/chat/completions', this.handleChatCompletions.bind(this));

    // Additional endpoints for conversation and workflow management
    this.app.get('/v1/conversations', this.handleListConversations.bind(this));
    this.app.get('/v1/conversations/:id/history', this.handleGetConversationHistory.bind(this));
    this.app.delete('/v1/conversations/:id', this.handleClearConversation.bind(this));

    this.app.get('/v1/workflows/sessions', this.handleListWorkflowSessions.bind(this));
    this.app.get('/v1/workflows/sessions/:id', this.handleGetWorkflowSession.bind(this));

    // Model information endpoint (OpenAI compatible)
    this.app.get('/v1/models', (req: Request, res: Response) => {
      res.json({
        object: 'list',
        data: [
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'coze-proxy',
            permission: [],
            root: 'gpt-3.5-turbo',
            parent: null,
          },
          {
            id: 'gpt-4',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'coze-proxy',
            permission: [],
            root: 'gpt-4',
            parent: null,
          },
        ],
      });
    });

    // Catch-all for unknown endpoints
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: {
          message: `Unknown endpoint: ${req.method} ${req.originalUrl}`,
          type: 'invalid_request_error',
          code: 'endpoint_not_found',
        },
      });
    });
  }

  // JWT Token Handlers
  private async handleGetJWT(req: Request, res: Response, next: NextFunction) {
    try {
      const token = await this.jwtManager.getToken();
      const tokenInfo = this.jwtManager.getTokenInfo();

      res.json({
        success: true,
        token,
        info: tokenInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  private async handleRefreshJWT(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenResponse = await this.jwtManager.refreshToken();

      res.json({
        success: true,
        ...tokenResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  private async handleClearJWT(req: Request, res: Response, next: NextFunction) {
    try {
      this.jwtManager.clearToken();

      res.json({
        success: true,
        message: 'JWT token cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  private async handleChatCompletions(req: Request, res: Response, next: NextFunction) {
    try {
      const request: OpenAIChatCompletionRequest = req.body;

      // Validate request
      if (!request.messages || !Array.isArray(request.messages)) {
        return res.status(400).json({
          error: {
            message: 'Messages array is required',
            type: 'invalid_request_error',
            code: 'missing_messages',
          },
        });
      }

      // Determine model type from headers or default
      const modelType = request['x-model-type'] ||
                       req.headers['x-model-type'] as string ||
                       config.defaultModelType;

      // Extract additional parameters from headers
      const botId = req.headers['x-bot-id'] as string || config.coze.botId;
      const workflowId = req.headers['x-workflow-id'] as string || config.coze.workflowId;
      const conversationId = req.headers['x-conversation-id'] as string;

      // Add these to the request object for handlers to use
      request['x-model-type'] = modelType as 'chat' | 'conversation' | 'workflow';
      request['x-bot-id'] = botId;
      request['x-workflow-id'] = workflowId;
      request['x-conversation-id'] = conversationId;

      // Handle streaming
      if (request.stream) {
        switch (modelType) {
          case 'chat':
            return await this.chatHandler.handleStreamingChatCompletion(request, res);
          case 'workflow':
            return await this.workflowHandler.handleStreamingWorkflowCompletion(request, res);
          case 'conversation':
            // For now, conversation doesn't support streaming
            return res.status(400).json({
              error: {
                message: 'Streaming not supported for conversation model type',
                type: 'invalid_request_error',
                code: 'streaming_not_supported',
              },
            });
          default:
            return res.status(400).json({
              error: {
                message: `Invalid model type: ${modelType}`,
                type: 'invalid_request_error',
                code: 'invalid_model_type',
              },
            });
        }
      }

      // Handle non-streaming
      let result;
      switch (modelType) {
        case 'chat':
          result = await this.chatHandler.handleChatCompletion(request);
          break;
        case 'conversation':
          result = await this.conversationHandler.handleConversationCompletion(request);
          break;
        case 'workflow':
          result = await this.workflowHandler.handleWorkflowCompletion(request);
          break;
        default:
          return res.status(400).json({
            error: {
              message: `Invalid model type: ${modelType}`,
              type: 'invalid_request_error',
              code: 'invalid_model_type',
            },
          });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  private async handleListConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = this.conversationHandler.listConversations();
      res.json({ conversations });
    } catch (error) {
      next(error);
    }
  }

  private async handleGetConversationHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const history = await this.conversationHandler.getConversationHistory(id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  private async handleClearConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await this.conversationHandler.clearConversation(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  private async handleListWorkflowSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = this.workflowHandler.listWorkflowSessions();
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  }

  private async handleGetWorkflowSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const session = this.workflowHandler.getWorkflowSession(id);
      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Workflow session not found',
            type: 'invalid_request_error',
            code: 'session_not_found',
          },
        });
      }
      res.json({ session });
    } catch (error) {
      next(error);
    }
  }

  private setupErrorHandling() {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', error);

      // Return OpenAI-compatible error format
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error',
          type: 'server_error',
          code: 'internal_error',
        },
      });
    });
  }

  public start() {
    const server = this.app.listen(config.port, () => {
      console.log(`🚀 OpenAI Proxy Server running on port ${config.port}`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
      console.log(`🤖 Chat completions: http://localhost:${config.port}/v1/chat/completions`);
      console.log(`📝 Model type: ${config.defaultModelType}`);
      console.log(`🔧 Coze API: ${config.coze.baseURL}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('📴 Server closed');
        process.exit(0);
      });
    });

    return server;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new OpenAIProxyServer();
  server.start();
}

export default OpenAIProxyServer;
