import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private client: RedisClientType;
  private isConnected = false;
  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = createClient({
        url: this.config.get('REDIS_URL', 'redis://localhost:6379'),
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis:Max connection attempt reached');
              return new Error('Max connection ateemptd reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });
      this.client.on('error', (err) => console.error('Redis Error:', err));
      this.client.on('connect', () => console.log('Redis connecting...'));
      this.client.on('ready', () => {
        console.log('Redis connected and ready');
        this.isConnected = true;
      });
      this.client.on('end', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      console.log('Redis connection closed gracefully');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.setEx(key, seconds, value);
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.isConnected || keys.length === 0) return 0;
    return this.client.del(keys);
  }

  async exists(...keys: string[]): Promise<number> {
    if (!this.isConnected) return 0;
    return this.client.exists(keys);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected) return [];
    return this.client.keys(pattern);
  }
  async ttl(key: string): Promise<number> {
    if (!this.isConnected) return -1;
    return this.client.ttl(key);
  }

  //   ** health checkup endpoints
  async ping() {
    if (!this.isConnected) return 'PONG';
    return this.client.ping();
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
