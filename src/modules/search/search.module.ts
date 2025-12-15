import { Module } from '@nestjs/common';
import { MealSearchService } from './services/Meal-search.service';
import { SearchController } from './controllers/search.controller';

@Module({
  providers: [MealSearchService],
  controllers: [SearchController]
})
export class SearchModule {}
