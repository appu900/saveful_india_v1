import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../infra/cache/redis.service';


interface RateLimitConfig {
  limit: number;
  ttl: number;
}


// ** aa coustom decorator for the ratelimiting guard
export const RateLimit = (limit: number, ttl: number) =>
  SetMetadata('rateLimit', { limit, ttl });


// ** the guard is for to implement the Ratelimiting on the desired endpoints
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      'rateLimit',
      context.getHandler(),
    );
    if (!rateLimitConfig) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const key = `rate_limit:${context.getClass().name}:${context.getHandler().name}:${userId}`;

    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= rateLimitConfig.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceed,please try again later',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const newCount = count + 1;
    if (count == 0) {
      await this.redis.set(
        key,
        newCount.toString(),
        Math.floor(rateLimitConfig.ttl / 1000),
      );
    } else {
      await this.redis.set(key, newCount.toString());
    }
    return true;
  }
}
