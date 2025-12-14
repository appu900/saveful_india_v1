import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisHealthController {
  constructor(private readonly redis: RedisService) {}

  @Get('/health')
  async checkRedis() {
    try {
      const pong = await this.redis.ping();
      const info = await this.redis.getClient().info();
      return {
        status: 'healthy',
        redis: {
          connected: true,
          ping: pong,
          uptime: info,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: {
          connected: false,
          error: error.message,
        },
      };
    }
  }
}
