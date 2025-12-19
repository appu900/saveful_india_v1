// src/ingredients/dto/ingredient.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateIf,
  Min,
  Max,
  IsInt,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IngredientType, Season, UserRole } from '@prisma/client';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value ? (Array.isArray(value) ? value : typeof value === 'string' ? JSON.parse(value) : []) : [])
  aliases?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @Type(() => Object)
  @Transform(({ value }) => value ? (typeof value === 'string' ? JSON.parse(value) : value) : undefined)
  nutritionInfo?: any;

  @IsOptional()
  @IsEnum(IngredientType)
  type?: IngredientType;

  @IsOptional()
  @IsArray()
  @IsEnum(Season, { each: true })
  @Transform(({ value }) => value ? (Array.isArray(value) ? value : typeof value === 'string' ? JSON.parse(value) : []) : [])
  availableSeasons?: Season[];

  @IsOptional()
  @IsString()
  categoryId?: string;

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
  isDairy?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isNut?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isGluten?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value ? (Array.isArray(value) ? value : typeof value === 'string' ? JSON.parse(value) : []) : [])
  tags?: string[];

  @IsOptional()
  @IsEnum(UserRole)
  addedBy?: UserRole;
}

export class UpdateIngredientDto extends CreateIngredientDto {
  @IsString()
  id: string;
}

export class SearchIngredientsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(IngredientType)
  type?: IngredientType;

  @IsOptional()
  @IsEnum(Season)
  season?: Season;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVegan?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}