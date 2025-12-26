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
  UpdateIngredientDto,
  SearchIngredientsDto,
} from './dto/ingrediants.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';

@Controller('ingrediants')
export class IngrediantsController {
  constructor(
    private readonly ingredientsService: IngrediantsService,
    private readonly s3Serice: S3ImageUploadService,
  ) {}

  @Post('/category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  async createCategory(@Body() dto: createIngrediantCategoryDto) {
    return this.ingredientsService.createIngrediantsCategory(dto);
  }

  @Get('/category')
  async fetchCategory() {
    return this.ingredientsService.fetchAllIngrediantsCategory();
  }

  @Patch('/category/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: createIngrediantCategoryDto
  ) {
    return this.ingredientsService.updateIngrediantsCategory(id, dto);
  }

  @Delete('/category/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  async deleteCategory(@Param('id') id: string) {
    return this.ingredientsService.deleteIngrediantsCategory(id);
  }

  /**
   * Get all ingredients
   * GET /ingrediants
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  async fetchAllIngrediants() {
    return this.ingredientsService.fetchAllIngrediants();
  }

 
  @Get('search')
  search(@Query() searchIngredientsDto: SearchIngredientsDto) {
    return this.ingredientsService.searchIngredients(searchIngredientsDto);
  }

  /**
   * Get by slug
   * GET /ingrediants/slug/:slug
   */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.ingredientsService.getIngredientBySlug(slug);
  }

  /**
   * Get ingredients by category
   * GET /ingrediants/filter/:categoryId
   */
  @Get('filter/:categoryId')
  async fetchIngrediantsById(@Param('categoryId') categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Bad request');
    }
    return this.ingredientsService.getIngredientByCategory(categoryId)
  }

  /**
   * Get ingredient by ID
   * GET /ingrediants/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingredientsService.getIngredientById(id);
  }

  /**
   * Create new ingredient
   * POST /ingrediants
   */
  @Post()
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

  /**
   * Update ingredient
   * PATCH /ingrediants/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF')
  @UseInterceptors(FileInterceptor('image'))
  async updateIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    let imageUrl = dto.imageUrl;
    if (image) {
      imageUrl = await this.s3Serice.uploadIngredientImage(image);
    }
    dto.imageUrl = imageUrl;
    return this.ingredientsService.updateIngredient(id, dto);
  }

  /**
   * Verify ingredient
   * PATCH /ingrediants/:id/verify
   */
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  verify(@Param('id') id: string) {
    return this.ingredientsService.verifyIngredient(id);
  }

  /**
   * Delete ingredient
   * DELETE /ingrediants/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.ingredientsService.deleteIngredient(id);
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