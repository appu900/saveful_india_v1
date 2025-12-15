import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { MealSearchService } from '../services/Meal-search.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.auth.guard';
import { SearchMealsDto } from '../dto/search.meals.dto';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private readonly mealSearchService: MealSearchService) {}

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async searchMeals(
    @Body() searchMealsDto: SearchMealsDto,
    @GetUser('id') userId: string,
  ) {
    const dtoWithUser = { ...searchMealsDto, userId };
    return this.mealSearchService.searchMeals(dtoWithUser);
  }

  @Post('search-simple')
  @UseGuards(JwtAuthGuard)
  async searchMealsSimple(
    @Body() searchMealsDto: SearchMealsDto,
    @GetUser('id') userId: string,
  ) {
    const dtoWithUser = { ...searchMealsDto, userId };
    return this.mealSearchService.searchMealsSimple(dtoWithUser);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMealById(
    @Param('id') mealId: string,
    @GetUser('id') userId: string,
  ) {
    return this.mealSearchService.getMealById(mealId, userId);
  }

  @Get(':id/similar')
  @UseGuards(JwtAuthGuard)
  async findSimilarMeals(
    @Param('id') mealId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.mealSearchService.findSimilarMeals(mealId, limit);
  }

  @Get('autocomplete-ingredients')
  async autocompleteIngredients(
    @Query('query') query: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.mealSearchService.autocompleteIngredients(query, limit);
  }

  @Get('trending')
  async getTrendingMeals(@Query('limit') limit: number = 10) {
    return this.mealSearchService.getTrendingMeals(limit);
  }
}
