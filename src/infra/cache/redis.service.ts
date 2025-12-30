import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisUrl =
      this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            this.logger.error('Redis max reconnect attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 200, 3000);
        },
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connecting...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis connected & ready');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis error', err);
    });

    this.client.on('end', () => {
      this.logger.warn('Redis connection closed');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }


  async get(key: string): Promise<string | null> {
    return this.client?.isOpen ? this.client.get(key) : null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client?.isOpen) return;

    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<number> {
    return this.client?.isOpen ? this.client.del(keys) : 0;
  }

  async exists(...keys: string[]): Promise<number> {
    return this.client?.isOpen ? this.client.exists(keys) : 0;
  }

  async ttl(key: string): Promise<number> {
    return this.client?.isOpen ? this.client.ttl(key) : -1;
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client?.isOpen ? this.client.keys(pattern) : [];
  }

  async ping(): Promise<string> {
    return this.client?.isOpen ? this.client.ping() : 'PONG';
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async cacheInvalidate(key: string): Promise<void> {
    if (!this.client?.isOpen) return;
    await this.client.del(key);
    this.logger.log(`Cache invalidated: ${key}`);
  }
}
