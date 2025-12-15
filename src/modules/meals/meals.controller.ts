import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MealsService } from './meals.service';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { CreateMealDto, UpdateMealDto } from './dto/meals.dto';


@Controller('meals')
export class MealsController {
  constructor(private mealService: MealsService) {}

  /**
   * Create meal with image upload
   * POST /meals
   * Content-Type: multipart/form-data
   */
  @Post()
  @RateLimit(20, 60000)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async createMeal(
    @Body() createMealDto: CreateMealDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false, // Optional if imageUrl is provided
      }),
    )
    image: Express.Multer.File,
    @Request() req,
  ) {
    return this.mealService.createMeal(createMealDto, req.user.id, image);
  }

  /**
   * Update meal with optional new image
   * PUT /meals/:id
   * Content-Type: multipart/form-data
   */
  @Put(':id')
  @RateLimit(30, 60000)
  @UseInterceptors(FileInterceptor('image'))
  async updateMeal(
    @Param('id') mealId: string,
    @Body() updateMealDto: UpdateMealDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    image: Express.Multer.File,
    @Request() req,
  ) {
    return this.mealService.updateMeal(
      mealId,
      updateMealDto,
      req.user.id,
      image,
    );
  }

  /**
   * Delete meal
   * DELETE /meals/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60000)
  async deleteMeal(@Param('id') mealId: string, @Request() req) {
    return this.mealService.deleteMeal(mealId, req.user.id);
  }

  /**
   * Get meal by ID
   * GET /meals/:id
   */
  @Get(':id')
  @RateLimit(100, 60000)
  async getMealById(@Param('id') mealId: string) {
    return this.mealService.getMealById(mealId);
  }

  /**
   * List meals
   * GET /meals
   */
  @Get()
  @RateLimit(50, 60000)
  async listMeals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('mealCategoryId') mealCategoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('isVeg') isVeg?: string,
  ) {
    const filters: any = {};

    if (mealCategoryId) filters.mealCategoryId = mealCategoryId;
    if (difficulty) filters.difficulty = difficulty;
    if (isVeg) filters.isVeg = isVeg === 'true';

    return this.mealService.listMeals(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      filters,
    );
  }
}
