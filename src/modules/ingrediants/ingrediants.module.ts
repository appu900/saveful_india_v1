import { Module } from '@nestjs/common';
import { IngrediantsService } from './ingrediants.service';
import { IngrediantsController } from './ingrediants.controller';

@Module({
  providers: [IngrediantsService],
  controllers: [IngrediantsController]
})
export class IngrediantsModule {}
