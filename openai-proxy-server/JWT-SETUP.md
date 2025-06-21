# JWT Authentication Setup Guide

This guide explains how to set up and use JWT authentication with the OpenAI Proxy Server.

## What is JWT Authentication?

JWT (JSON Web Token) authentication provides a more secure and flexible way to authenticate with Coze API compared to static API keys. It offers:

- **Automatic token refresh**: Tokens are automatically renewed when they expire
- **Better security**: Tokens have limited lifetime
- **Session isolation**: Different sessions can be managed separately

## Prerequisites

Before setting up JWT authentication, you need to:

1. **Create a JWT OAuth App** in Coze:
   - Go to https://www.coze.com/open/oauth/apps (or https://www.coze.cn/open/oauth/apps for CN)
   - Create a new OAuth App of type "JWT application"
   - Follow the guide: https://www.coze.com/docs/developer_guides/oauth_jwt

2. **Generate a private/public key pair**:
   ```bash
   # Generate private key
   openssl genrsa -out private_key.pem 2048

   # Generate public key
   openssl rsa -in private_key.pem -pubout -out public_key.pem
   ```

3. **Upload the public key** to your Coze OAuth app settings

4. **Note down the following values** from your OAuth app:
   - App ID
   - Key ID
   - Audience (usually `api.coze.com` or `api.coze.cn`)

## Environment Configuration

Set up your environment variables in `.env`:

```bash
# JWT Configuration (Required)
COZE_JWT_APP_ID=your_app_id_from_coze
COZE_JWT_KEY_ID=your_key_id_from_coze
COZE_JWT_AUD=api.coze.com
COZE_JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key content here\n-----END PRIVATE KEY-----
COZE_JWT_SESSION_NAME=my-app-session

# Coze Service Configuration
COZE_BASE_URL=https://api.coze.com
COZE_BOT_ID=your_bot_id
COZE_WORKFLOW_ID=your_workflow_id

# Server Configuration
PORT=3000
DEFAULT_MODEL_TYPE=chat
```

## Usage Examples

### 1. Start the Server

```bash
npm run dev
```

### 2. Test JWT Endpoints

```bash
# Test all JWT functionality
npm run test:jwt

# Or manually test endpoints
curl http://localhost:3000/get_jwt
curl -X POST http://localhost:3000/refresh_jwt
curl -X DELETE http://localhost:3000/clear_jwt
```

### 3. Use with OpenAI SDK

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'not-used', // Required by SDK but not used by proxy
  baseURL: 'http://localhost:3000/v1'
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### 4. Run Complete Example

```bash
npm run example:jwt
```

## JWT Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_jwt` | GET | Get current JWT token (creates if needed) |
| `/refresh_jwt` | POST | Force refresh the JWT token |
| `/clear_jwt` | DELETE | Clear current token (force refresh on next request) |
| `/health` | GET | Health check with JWT status |

## How It Works

1. **Automatic Token Management**: The proxy automatically handles JWT token lifecycle
2. **Token Refresh**: Tokens are refreshed automatically before expiration (5-second buffer)
3. **Fallback Support**: If JWT is not configured, falls back to API key authentication
4. **Session Isolation**: Different sessions can be managed with the `sessionName` parameter

## Troubleshooting

### Common Issues

**1. "JWT configuration not provided"**
- Ensure `COZE_JWT_APP_ID` is set in your environment
- Verify all required JWT environment variables are configured

**2. "Failed to refresh JWT token"**
- Check that your private key is correctly formatted
- Verify the App ID, Key ID, and Audience are correct
- Ensure the public key is uploaded to Coze

**3. "Token refresh failed"**
- Check network connectivity to Coze API
- Verify your OAuth app is active and configured correctly

### Debug Steps

1. **Check configuration**:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Test JWT generation**:
   ```bash
   curl http://localhost:3000/get_jwt
   ```

3. **Enable detailed logging**:
   ```bash
   ENABLE_LOGGING=true npm run dev
   ```

## Security Best Practices

1. **Keep private keys secure**: Never commit private keys to version control
2. **Use environment variables**: Store all sensitive configuration in `.env` files
3. **Rotate keys regularly**: Generate new key pairs periodically
4. **Monitor token usage**: Check logs for unusual authentication patterns
5. **Use HTTPS in production**: Always use SSL/TLS for production deployments

## Migration from API Key

If you're currently using API key authentication:

1. Keep your existing `COZE_API_KEY` as fallback
2. Add JWT configuration variables
3. Test with JWT enabled
4. Remove API key once JWT is working
5. Update your deployment configuration

The proxy will automatically prefer JWT when available, falling back to API key if JWT is not configured.
