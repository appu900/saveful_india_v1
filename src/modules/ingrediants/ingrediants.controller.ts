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
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { IngrediantsService } from './ingrediants.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CreateIngredientDto,
  SearchIngredientsDto,
} from './dto/ingrediants.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Season } from '@prisma/client';
import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';

@Controller('ingrediants')
export class IngrediantsController {
  constructor(
    private readonly ingredientsService: IngrediantsService,
    private readonly s3Serice: S3ImageUploadService,
  ) {}

  @Post('/category')
  async createCategory(@Body() dto: createIngrediantCategoryDto) {
    return this.ingredientsService.createIngrediantsCategory(dto);
  }
  @Get('/category')
  async fetchCategory() {
    return this.ingredientsService.fetchAllIngrediantsCategory();
  }

  @Post('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')                                           
  @UseInterceptors(FileInterceptor('image'))
  async createIngredient(
    @Body() dto: CreateIngredientDto,
    @UploadedFile() image: Express.Multer.File,
    @GetUser() user: any,
  ) {
    let imageUrl = '';
    if (image) {
      imageUrl = await this.s3Serice.uploadIngredientImage(image);
    }
    dto.imageUrl = imageUrl;
    return this.ingredientsService.createIngredient(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingredientsService.getIngredientById(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.ingredientsService.getIngredientBySlug(slug);
  }

  @Get()
  search(@Query() searchIngredientsDto: SearchIngredientsDto) {
    return this.ingredientsService.searchIngredients(searchIngredientsDto);
  }

  /**
   * Get ingredients by season
   * GET /ingredients/season/:season?limit=50
   */
  @Get('season/:season')
  async getIngredientsBySeason(
    @Param('season') seasonParam: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const season = Season[seasonParam.toUpperCase() as keyof typeof Season];
    console.log(season);
    return this.ingredientsService.getIngredientsBySeason(season, limit);
  }

  @Get('filter/:categoryId')
  async fetchIngrediantsById(@Param('categoryId') categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Bad request');
    }
    return this.ingredientsService.getIngredientByCategory(categoryId)

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

  @Patch(':id/verify')
  verify(@Param('id') id: string) {
    return this.ingredientsService.verifyIngredient(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientsService.deleteIngredient(id);
  }

  @Get('')
  async fetchAllIngrediants() {
    return this.ingredientsService.fetchAllIngrediants();
  }
}




/**
 * 
 * 
 * chef ra profile admin create kariba ?
 * 
 * then seita autometically hei jiba access daba darkar nhi 
 * 
 * 
 * admin 
 *     fetch all chefs 
 *     update and delete 
 *     fetch other admins 
 *     
 * 
 */