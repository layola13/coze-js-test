import { CozeAPI } from '@coze/api';
import { CozeConfig } from '../types';

export class CozeClient {
  private client: CozeAPI;
  private config: CozeConfig;

  constructor(config: CozeConfig) {
    this.config = config;
    this.client = new CozeAPI({
      baseURL: config.baseURL,
      token: config.apiKey,
      baseWsURL: config.baseWsURL,
      debug: config.debug || false,
    });
  }

  getClient(): CozeAPI {
    return this.client;
  }

  getConfig(): CozeConfig {
    return this.config;
  }

  updateConfig(updates: Partial<CozeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.client = new CozeAPI({
      baseURL: this.config.baseURL,
      token: this.config.apiKey,
      baseWsURL: this.config.baseWsURL,
      debug: this.config.debug || false,
    });
  }
}
