// recipe.dto.ts
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty, 
  ArrayMinSize,
  IsBoolean,
  IsInt,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecipeDifficulty, RecipeType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// INGREDIENT IN CATEGORY DTO 
// ============================================

export class RecipeIngredientItemDto {
  @ApiProperty({ description: 'Ingredient ID from database' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ description: 'Quantity with unit (e.g., "2 cups", "500gm")' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiPropertyOptional({ description: 'Is this ingredient optional?' })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ description: 'Sort order within category' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// ============================================
// INGREDIENT CATEGORY DTO
// ============================================

export class RecipeIngredientCategoryDto {
  @ApiProperty({ description: 'Category name (e.g., "Rice", "Oil", "Spices")' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiProperty({ 
    description: 'Ingredients in this category',
    type: [RecipeIngredientItemDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientItemDto)
  ingredients: RecipeIngredientItemDto[];

  @ApiPropertyOptional({ description: 'Sort order of category' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// ============================================
// COOKING STEP DTO
// ============================================

export class CookingStepDto {
  @ApiProperty({ description: 'Step number (1, 2, 3, etc.)' })
  @IsInt()
  @Min(1)
  stepNumber: number;

  @ApiPropertyOptional({ description: 'Step title (optional)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Step instructions' })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiPropertyOptional({ description: 'Image URL for this step' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

// ============================================
// CREATE RECIPE DTO
// ============================================

export class CreateRecipeDto {
  @ApiProperty({ description: 'Recipe name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Portions (e.g., "4 servings")' })
  @IsOptional()
  @IsString()
  portions?: string;

  @ApiPropertyOptional({ description: 'Prep and cook time (e.g., "~30min")' })
  @IsOptional()
  @IsString()
  prepAndCookTime?: string;

  @ApiPropertyOptional({ description: 'Recipe image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'About this dish description' })
  @IsString()
  @IsNotEmpty()
  aboutThisDish: string;

  @ApiProperty({ description: 'Pro tips for cooking this dish' })
  @IsString()
  @IsNotEmpty()
  proTip: string;

  @ApiPropertyOptional({ description: 'How to save/store the dish' })
  @IsOptional()
  @IsString()
  savingTechnique?: string;

  @ApiPropertyOptional({ description: 'YouTube video URL' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Recipe difficulty',
    enum: RecipeDifficulty,
    default: RecipeDifficulty.EASY
  })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ 
    description: 'Recipe type',
    enum: RecipeType,
    default: RecipeType.MAIN_COURSE
  })
  @IsOptional()
  @IsEnum(RecipeType)
  recipeType?: RecipeType;

  @ApiPropertyOptional({ description: 'Region ID' })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiProperty({ 
    description: 'Ingredient categories with ingredients',
    type: [RecipeIngredientCategoryDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientCategoryDto)
  ingredientCategories: RecipeIngredientCategoryDto[];

  @ApiProperty({ 
    description: 'Cooking steps',
    type: [CookingStepDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CookingStepDto)
  cookingSteps: CookingStepDto[];
}

// ============================================
// UPDATE RECIPE DTO
// ============================================

export class UpdateRecipeDto {
  @ApiPropertyOptional({ description: 'Recipe name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Portions' })
  @IsOptional()
  @IsString()
  portions?: string;

  @ApiPropertyOptional({ description: 'Prep and cook time' })
  @IsOptional()
  @IsString()
  prepAndCookTime?: string;

  @ApiPropertyOptional({ description: 'Recipe image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'About this dish' })
  @IsOptional()
  @IsString()
  aboutThisDish?: string;

  @ApiPropertyOptional({ description: 'Pro tip' })
  @IsOptional()
  @IsString()
  proTip?: string;

  @ApiPropertyOptional({ description: 'Saving technique' })
  @IsOptional()
  @IsString()
  savingTechnique?: string;

  @ApiPropertyOptional({ description: 'YouTube URL' })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ enum: RecipeDifficulty })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ enum: RecipeType })
  @IsOptional()
  @IsEnum(RecipeType)
  recipeType?: RecipeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional({ type: [RecipeIngredientCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientCategoryDto)
  ingredientCategories?: RecipeIngredientCategoryDto[];

  @ApiPropertyOptional({ type: [CookingStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CookingStepDto)
  cookingSteps?: CookingStepDto[];
}

// ============================================
// SEARCH RECIPES DTO
// ============================================

export class SearchRecipesDto {
  @ApiPropertyOptional({ 
    description: 'Ingredient IDs to search (comma-separated)',
    example: 'uuid1,uuid2,uuid3'
  })
  @IsOptional()
  @IsString()
  ingredientIds?: string;

  @ApiPropertyOptional({ enum: RecipeType })
  @IsOptional()
  @IsEnum(RecipeType)
  recipeType?: RecipeType;

  @ApiPropertyOptional({ enum: RecipeDifficulty })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ description: 'Vegetarian only' })
  @IsOptional()
  @IsString()
  isVeg?: string;

  @ApiPropertyOptional({ description: 'Vegan only' })
  @IsOptional()
  @IsString()
  isVegan?: string;

  @ApiPropertyOptional({ description: 'Dairy free' })
  @IsOptional()
  @IsString()
  dairyFree?: string;

  @ApiPropertyOptional({ description: 'Nut free' })
  @IsOptional()
  @IsString()
  nutFree?: string;

  @ApiPropertyOptional({ description: 'Gluten free' })
  @IsOptional()
  @IsString()
  glutenFree?: string;

  @ApiPropertyOptional({ description: 'Search text' })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional({ description: 'Limit', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

// ============================================
// BOOKMARK RECIPE DTO
// ============================================

export class BookmarkRecipeDto {
  @ApiProperty({ description: 'Recipe ID to bookmark' })
  @IsString()
  @IsNotEmpty()
  recipeId: string;
}

// ============================================
// RATE RECIPE DTO
// ============================================

export class RateRecipeDto {
  @ApiProperty({ description: 'Recipe ID' })
  @IsString()
  @IsNotEmpty()
  recipeId: string;

  @ApiProperty({ description: 'Rating (1-5 stars)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}