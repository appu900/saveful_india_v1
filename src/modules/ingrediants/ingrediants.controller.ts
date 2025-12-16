import {
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  UseInterceptors,
  Body,
  UploadedFile,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { IngrediantsService } from './ingrediants.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateIngredientDto } from './dto/ingrediants.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Season } from '@prisma/client';
import { UpdateIngredientDto } from '../meals/dto/meals.dto';
import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';

@Controller('ingrediants')
export class IngrediantsController {
  constructor(private readonly ingredientsService: IngrediantsService) {}

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  @UseInterceptors(FileInterceptor('image'))
  async createIngredient(
    @Body() createIngredientDto: CreateIngredientDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: any,
  ) {
    return this.ingredientsService.createIngredient(
      createIngredientDto,
      image,
      user.userId,
    );
  }

  /**
   * Chef adds ingredient (needs verification)
   * POST /ingredients/chef
   */
  @Post('chef')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CHEF')
  @UseInterceptors(FileInterceptor('image'))
  async chefAddIngredient(
    @Body() createIngredientDto: CreateIngredientDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: any,
  ) {
    return this.ingredientsService.chefAddIngredient(
      createIngredientDto,
      image,
      user.userId,
    );
  }

  /**
   * Get ingredients by season
   * GET /ingredients/season/:season?limit=50
   */
  @Get('season/:season')
  async getIngredientsBySeason(
    @Param('season') season: Season,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.ingredientsService.getIngredientsBySeason(season, limit);
  }

  /**
   * Get current season's ingredients
   * GET /ingredients/season/current?limit=50
   */
  @Get('season/current')
  async getCurrentSeasonIngredients(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.ingredientsService.getCurrentSeasonIngredients(limit);
  }

  /**
   * Search ingredients
   * GET /ingredients/search?query=tomato&limit=20
   */
  @Get('search')
  async searchIngredients(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!query) {
      return { message: 'Query parameter is required', ingredients: [] };
    }
    return this.ingredientsService.searchIngredients(query, limit);
  }

  /**
   * Get vegetables only
   * GET /ingredients/vegetables?limit=50
   */
  @Get('vegetables')
  async getVegetables(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.ingredientsService.getVegetables(limit);
  }

  /**
   * Get fruits only
   * GET /ingredients/fruits?limit=50
   */
  @Get('fruits')
  async getFruits(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.ingredientsService.getFruits(limit);
  }

  /**
   * Admin verifies chef-added ingredient
   * PATCH /ingredients/:id/verify
   */
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async verifyIngredient(@Param('id') id: string, @GetUser() user: any) {
    return this.ingredientsService.verifyIngredient(id, user.userId);
  }

  /**
   * Update ingredient with optional new image
   * PATCH /ingredients/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image'))
  async updateIngredient(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.ingredientsService.updateIngredient(
      id,
      updateIngredientDto,
      image,
    );
  }

  /**
   *
   * create ingredinats category
   * will be added only by admin
   */

//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('ADMIN')
  @Post('/category')
  async createCategory(@Body() dto: createIngrediantCategoryDto) {
    return this.ingredientsService.createIngrediantsCategory(dto);
  }

  @Get('/category')
  async fetchCategory(@Body() dto: createIngrediantCategoryDto) {
    return this.ingredientsService.fetchAllIngrediantsCategory();
  }
}
