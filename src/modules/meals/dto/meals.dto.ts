
import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
  IsBoolean,
  IsUrl,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ============================================
// INGREDIENT INPUT DTO
// ============================================
export class IngredientInputDto {
  @IsString()
  @MinLength(2, { message: 'Ingredient name must be at least 2 characters' })
  @MaxLength(100, { message: 'Ingredient name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantity?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOptional?: boolean;
}

// ============================================
// CREATE MEAL DTO
// ============================================
export class CreateMealDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Short description must not exceed 500 characters' })
  shortDescription?: string;

  @IsString()
  @MinLength(50, { message: 'Instructions must be at least 50 characters' })
  @MaxLength(5000, { message: 'Instructions must not exceed 5000 characters' })
  instructions: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ingredient is required' })
  @ValidateNested({ each: true })
  @Type(() => IngredientInputDto)
  @Transform(({ value }) => {
    // Handle JSON string from multipart/form-data
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  ingredients: IngredientInputDto[];

  @IsOptional()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Cooking time must be at least 1 minute' })
  @Max(1440, { message: 'Cooking time must not exceed 1440 minutes (24 hours)' })
  @Transform(({ value }) => parseInt(value))
  cookingTimeMinutes?: number;

  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'], { message: 'Difficulty must be EASY, MEDIUM, or HARD' })
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsUUID('4', { message: 'Meal category ID must be a valid UUID' })
  mealCategoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Region ID must be a valid UUID' })
  regionId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  diabetesFriendly?: boolean;
}

// ============================================
// UPDATE MEAL DTO
// ============================================
export class UpdateMealDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  instructions?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredientInputDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  ingredients?: IngredientInputDto[];

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  @Transform(({ value }) => parseInt(value))
  cookingTimeMinutes?: number;

  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsUUID('4')
  mealCategoryId?: string;

  @IsOptional()
  @IsUUID('4')
  regionId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  diabetesFriendly?: boolean;
}

// ============================================
// SEARCH MEALS DTO
// ============================================
export class SearchMealsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ingredient is required' })
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  ingredients: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mealCategory?: string;

  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  @Transform(({ value }) => parseInt(value))
  maxCookingTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

// ============================================
// LIST MEALS QUERY DTO
// ============================================
export class ListMealsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsUUID('4')
  mealCategoryId?: string;

  @IsOptional()
  @IsUUID('4')
  regionId?: string;

  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  dairyFree?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  nutFree?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  glutenFree?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  @Transform(({ value }) => parseInt(value))
  maxCookingTime?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

// ============================================
// INGREDIENT DTOs
// ============================================

export class CreateIngredientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  aliases?: string[];

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  isDairy?: boolean;

  @IsOptional()
  @IsBoolean()
  isNut?: boolean;

  @IsOptional()
  @IsBoolean()
  isGluten?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  isDairy?: boolean;

  @IsOptional()
  @IsBoolean()
  isNut?: boolean;

  @IsOptional()
  @IsBoolean()
  isGluten?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AutocompleteQueryDto {
  @IsString()
  @MinLength(2, { message: 'Query must be at least 2 characters' })
  @MaxLength(100)
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

// ============================================
// MEAL CATEGORY DTOs
// ============================================

export class CreateMealCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class UpdateMealCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

// ============================================
// BULK IMPORT DTO
// ============================================

export class BulkImportMealsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one meal is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateMealDto)
  meals: CreateMealDto[];
}

// ============================================
// RESPONSE DTOs (for documentation)
// ============================================

export class MealIngredientResponseDto {
  id: string;
  name: string;
  slug: string;
  quantity?: string;
  isOptional: boolean;
  isVeg: boolean;
  isVegan: boolean;
  isDairy: boolean;
  isNut: boolean;
  isGluten: boolean;
}

export class MealResponseDto {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  instructions: string;
  imageUrl?: string;
  cookingTimeMinutes?: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  
  mealCategoryId?: string;
  regionId?: string;
  
  ingredientIds: string[];
  ingredientNames: string[];
  ingredientSlugs: string[];
  
  isVeg: boolean;
  isVegan: boolean;
  dairyFree: boolean;
  nutFree: boolean;
  glutenFree: boolean;
  diabetesFriendly: boolean;
  
  searchText?: string;
  viewCount: number;
  clickCount: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  ingredients?: MealIngredientResponseDto[];
  mealCategory?: {
    id: string;
    name: string;
    description?: string;
  };
  region?: {
    id: string;
    name: string;
    countryCode: string;
  };
}

export class SearchMealsResponseDto {
  results: Array<MealResponseDto & {
    matchedCount: number;
    totalIngredients: number;
    matchPercentage: number;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class ListMealsResponseDto {
  meals: MealResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// VALIDATION ERROR MESSAGES
// ============================================

export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: 'Title is required',
  TITLE_MIN_LENGTH: 'Title must be at least 3 characters',
  TITLE_MAX_LENGTH: 'Title must not exceed 200 characters',
  
  INSTRUCTIONS_REQUIRED: 'Instructions are required',
  INSTRUCTIONS_MIN_LENGTH: 'Instructions must be at least 50 characters',
  
  INGREDIENTS_REQUIRED: 'At least one ingredient is required',
  INGREDIENT_NAME_REQUIRED: 'Ingredient name is required',
  
  COOKING_TIME_MIN: 'Cooking time must be at least 1 minute',
  COOKING_TIME_MAX: 'Cooking time must not exceed 24 hours',
  
  DIFFICULTY_INVALID: 'Difficulty must be EASY, MEDIUM, or HARD',
  
  IMAGE_SIZE: 'Image size must be less than 5MB',
  IMAGE_TYPE: 'Only JPEG, PNG, and WebP images are allowed',
  
  UUID_INVALID: 'Invalid ID format',
};

