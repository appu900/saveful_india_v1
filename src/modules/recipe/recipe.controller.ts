// recipe.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { RecipeService } from './recipe.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  SearchRecipesDto,
  BookmarkRecipeDto,
  RateRecipeDto,
} from './dto/recipe.dtos';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Uncomment when auth is ready

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly ImageUploadService: S3ImageUploadService,
  ) {}

  // ============================================
  // CREATE RECIPE
  // ============================================

  @Post()
  // @Roles('CHEF', 'ADMIN')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Recipe already exists' })
  async createRecipe(@Body(ValidationPipe) dto: CreateRecipeDto) {
    return this.recipeService.createRecipe(dto);
  }

  // ============================================
  // UPLOAD RECIPE IMAGE
  // ============================================

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload recipe image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.ImageUploadService.uploadMealImage(file);
    return {
      imageUrl: imageUrl,
      message: 'Image uploaded successfully',
    };
  }

  // ============================================
  // GET RECIPES
  // ============================================

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('USER', 'CHEF', 'ADMIN')
  @ApiOperation({ summary: 'Get all recipes with pagination' })
  @ApiResponse({ status: 200, description: 'List of recipes' })
  async getAllRecipes(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.recipeService.getAllRecipes(
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular recipes' })
  @ApiResponse({ status: 200, description: 'List of popular recipes' })
  async getPopularRecipes(@Query('limit') limit?: string) {
    return this.recipeService.getPopularRecipes(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search recipes by ingredients and filters' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchRecipes(@Query(ValidationPipe) dto: SearchRecipesDto) {
    return this.recipeService.searchRecipesByIngredients(dto);
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Get recipes by type (BREAKFAST, LUNCH, DINNER, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Recipes of specified type' })
  async getRecipesByType(
    @Param('type') type: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.recipeService.getRecipesByType(
      type,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipe by ID' })
  @ApiResponse({ status: 200, description: 'Recipe details' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async getRecipeById(@Param('id') id: string) {
    return this.recipeService.getRecipeById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get recipe by slug' })
  @ApiResponse({ status: 200, description: 'Recipe details' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async getRecipeBySlug(@Param('slug') slug: string) {
    return this.recipeService.getRecipeBySlug(slug);
  }

  // ============================================
  // UPDATE RECIPE
  // ============================================

  @Put(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Update recipe' })
  @ApiResponse({ status: 200, description: 'Recipe updated successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async updateRecipe(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateRecipeDto,
  ) {
    return this.recipeService.updateRecipe(id, dto);
  }

  // ============================================
  // DELETE RECIPE
  // ============================================

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete recipe' })
  @ApiResponse({ status: 204, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async deleteRecipe(@Param('id') id: string) {
    await this.recipeService.deleteRecipe(id);
  }

  // ============================================
  // BOOKMARK OPERATIONS
  // ============================================

  @Post('bookmark')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark a recipe' })
  @ApiResponse({ status: 201, description: 'Recipe bookmarked' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiResponse({ status: 409, description: 'Already bookmarked' })
  async bookmarkRecipe(
    @Body(ValidationPipe) dto: BookmarkRecipeDto,
    // @Request() req: any, // Uncomment when auth is ready
  ) {
    // TODO: Get userId from JWT token
    const userId = 'temp-user-id'; // Replace with: req.user.id
    return this.recipeService.bookmarkRecipe(userId, dto);
  }

  @Delete('bookmark/:recipeId')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove bookmark' })
  @ApiResponse({ status: 204, description: 'Bookmark removed' })
  @ApiResponse({ status: 404, description: 'Bookmark not found' })
  async removeBookmark(
    @Param('recipeId') recipeId: string,
    // @Request() req: any,
  ) {
    const userId = 'temp-user-id'; // Replace with: req.user.id
    await this.recipeService.removeBookmark(userId, recipeId);
  }

  @Get('user/bookmarks')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user bookmarks' })
  @ApiResponse({ status: 200, description: 'User bookmarks' })
  async getUserBookmarks(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    // @Request() req: any,
  ) {
    const userId = 'temp-user-id'; // Replace with: req.user.id
    return this.recipeService.getUserBookmarks(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  // ============================================
  // RATE RECIPE
  // ============================================

  @Post('rate')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a recipe' })
  @ApiResponse({ status: 201, description: 'Recipe rated successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  async rateRecipe(
    @Body(ValidationPipe) dto: RateRecipeDto,
    // @Request() req: any,
  ) {
    const userId = 'temp-user-id'; // Replace with: req.user.id
    return this.recipeService.rateRecipe(userId, dto);
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
1. CREATE RECIPE
POST /recipes
{
  "name": "Crispy Rice Salad with Curry Mayo",
  "portions": "4 servings",
  "prepAndCookTime": "~30min",
  "imageUrl": "https://...",
  "aboutThisDish": "Say hello to the salad that does it all...",
  "proTip": "Use an air fryer for extra crispy rice!",
  "savingTechnique": "Store in airtight container for up to 3 days",
  "youtubeUrl": "https://youtube.com/...",
  "difficulty": "EASY",
  "recipeType": "DINNER",
  "ingredientCategories": [
    {
      "categoryName": "Rice",
      "sortOrder": 0,
      "ingredients": [
        {
          "ingredientId": "uuid-of-rice",
          "quantity": "2 cups",
          "isOptional": false,
          "sortOrder": 0
        },
        {
          "ingredientId": "uuid-of-jasmine-rice",
          "quantity": "2 cups",
          "isOptional": true,
          "sortOrder": 1
        }
      ]
    },
    {
      "categoryName": "Oil",
      "sortOrder": 1,
      "ingredients": [
        {
          "ingredientId": "uuid-of-olive-oil",
          "quantity": "2 tbsp",
          "isOptional": false
        },
        {
          "ingredientId": "uuid-of-avocado-oil",
          "quantity": "2 tbsp",
          "isOptional": true
        }
      ]
    }
  ],
  "cookingSteps": [
    {
      "stepNumber": 1,
      "title": "Prepare Rice",
      "instruction": "Add 2 cups of cooked rice to a bowl...",
      "imageUrl": "https://..."
    },
    {
      "stepNumber": 2,
      "title": "Make Dressing",
      "instruction": "Mix curry paste and mayo...",
      "imageUrl": "https://..."
    }
  ]
}

2. SEARCH BY INGREDIENTS
GET /recipes/search?ingredientIds=uuid1,uuid2,uuid3&isVeg=true&limit=10

3. GET RECIPE BY TYPE
GET /recipes/type/BREAKFAST?limit=20

4. BOOKMARK RECIPE
POST /recipes/bookmark
{
  "recipeId": "uuid-of-recipe"
}

5. RATE RECIPE
POST /recipes/rate
{
  "recipeId": "uuid-of-recipe",
  "rating": 5,
  "notes": "Absolutely delicious!"
}

6. UPLOAD IMAGE
POST /recipes/upload-image
Content-Type: multipart/form-data
Body: { image: [file] }
*/
