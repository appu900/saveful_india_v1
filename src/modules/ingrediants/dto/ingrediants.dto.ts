import { IsString, IsOptional, IsArray, IsBoolean, Min, Max, IsInt, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

const toBoolean = (value: any): boolean => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
};

const parseStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  aliases?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  nutritionInfo?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isDairy?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isNut?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isGluten?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  hasPage?: boolean;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  inSeasonMonths?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isPantryItem?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  averageWeight?: number;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  aliases?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  nutritionInfo?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isVegan?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isDairy?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isNut?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isGluten?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  hasPage?: boolean;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => parseStringArray(value))
  inSeasonMonths?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isPantryItem?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  averageWeight?: number;
}

export class SearchIngredientsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  isVeg?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
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
