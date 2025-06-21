import { getJWTToken } from '@coze/api';
import type { ProxyConfig, JWTTokenResponse } from './types';

export class JWTManager {
  private config: ProxyConfig;
  private currentToken: JWTTokenResponse | null = null;
  private tokenExpiryBuffer = 5000; // 5 seconds buffer

  constructor(config: ProxyConfig) {
    this.config = config;
  }

  /**
   * Get current valid JWT token, refresh if needed
   */
  async getToken(): Promise<string> {
    if (!this.config.coze.jwt) {
      // Fallback to direct API key if JWT not configured
      if (this.config.coze.apiKey) {
        return this.config.coze.apiKey;
      }
      throw new Error('Neither JWT configuration nor API key provided');
    }

    // Check if current token is still valid
    if (this.currentToken && this.isTokenValid()) {
      return this.currentToken.access_token;
    }

    // Refresh token
    await this.refreshToken();
    return this.currentToken!.access_token;
  }

  /**
   * Manually refresh JWT token
   */
  async refreshToken(): Promise<JWTTokenResponse> {
    if (!this.config.coze.jwt) {
      throw new Error('JWT configuration not provided');
    }

    const { appId, keyId, aud, privateKey, sessionName } = this.config.coze.jwt;

    try {
      this.currentToken = await getJWTToken({
        baseURL: this.config.coze.baseURL,
        appId,
        aud,
        keyid: keyId,
        privateKey,
        sessionName: sessionName || 'openai-proxy',
      });

      console.log('JWT Token refreshed successfully', {
        expires_in: this.currentToken.expires_in,
        token_type: this.currentToken.token_type,
      });

      return this.currentToken;
    } catch (error) {
      console.error('Failed to refresh JWT token:', error);
      throw new Error(`JWT token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if current token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.currentToken) {
      return false;
    }

    const expiryTime = this.currentToken.expires_in * 1000;
    const currentTime = Date.now();

    return expiryTime > currentTime + this.tokenExpiryBuffer;
  }

  /**
   * Get token info (for debugging/monitoring)
   */
  getTokenInfo(): { hasToken: boolean; isValid: boolean; expiresIn?: number } {
    return {
      hasToken: !!this.currentToken,
      isValid: this.isTokenValid(),
      expiresIn: this.currentToken?.expires_in,
    };
  }

  /**
   * Clear current token (force refresh on next request)
   */
  clearToken(): void {
    this.currentToken = null;
  }
}
