import { Module } from '@nestjs/common';
import { HackController } from './hack.controller';
import { HackService } from './hack.service';

@Module({
  controllers: [HackController],
  providers: [HackService]
})
export class HackModule {}
