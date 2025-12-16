import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, Min, Max, IsIn, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientType, Season } from "@prisma/client";

const allowedSeasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'] as const;
type AllowedSeasons = typeof allowedSeasons[number];

export class CreateIngredientDto {
  @ApiProperty({ description: 'Name of the ingredient', example: 'Tomato' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Alternative names for the ingredient', type: [String], example: ['Cherry tomato'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        // If not JSON, split by comma
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ description: 'Description of the ingredient', example: 'A red fruit used in salads' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Nutritional information', example: 'High in Vitamin C' })
  @IsOptional()
  @IsString()
  nutritionInfo?: string;

  @ApiPropertyOptional({ description: 'Type of ingredient', enum: IngredientType, example: IngredientType.VEGETABLE })
  @IsOptional()
  @IsEnum(IngredientType)
  type?: IngredientType;

  @ApiPropertyOptional({ description: 'Whether it is a vegetable', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isVegetable?: boolean;

  @ApiPropertyOptional({ description: 'Whether it is a fruit', example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isFruit?: boolean;

  @ApiPropertyOptional({ description: 'Available seasons', type: [String], example: ['SPRING', 'SUMMER'] })
  @IsOptional()
  @Transform(({ value }) => {
    let arr = value;
    
    // Handle string input (from form-data)
    if (typeof value === 'string') {
      try {
        // Try parsing as JSON array first
        const parsed = JSON.parse(value);
        arr = Array.isArray(parsed) ? parsed : [value];
      } catch {
        // If not JSON, split by comma
        arr = value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    } else if (!Array.isArray(value)) {
      arr = [];
    }
    
    // Convert all values to uppercase
    return arr.map((item) => (typeof item === 'string' ? item.toUpperCase() : item));
  })
  @IsArray()
  @IsIn(allowedSeasons, { 
    each: true, 
    message: `Each value in availableSeasons must be one of: ${allowedSeasons.join(', ')}` 
  })
  availableSeasons?: AllowedSeasons[];

  @ApiPropertyOptional({ description: 'Category ID', example: 'cat_123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Vegetarian friendly', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isVeg?: boolean;

  @ApiPropertyOptional({ description: 'Vegan friendly', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isVegan?: boolean;

  @ApiPropertyOptional({ description: 'Contains dairy', example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isDairy?: boolean;

  @ApiPropertyOptional({ description: 'Contains nuts', example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isNut?: boolean;

  @ApiPropertyOptional({ description: 'Contains gluten', example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isGluten?: boolean;

  @ApiPropertyOptional({ description: 'Tags for the ingredient', type: [String], example: ['organic', 'fresh'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        // If not JSON, split by comma
        return value.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// User Interaction DTOs
export class CookMealDto {
  @ApiPropertyOptional({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'User notes about cooking the meal', example: 'Added extra spices' })
  @IsOptional()
  @IsString()
  notes?: string;
}