import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisHealthController } from './redis.controller';





function handleConnectionError(err:any){
  console.error
}
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [RedisHealthController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
