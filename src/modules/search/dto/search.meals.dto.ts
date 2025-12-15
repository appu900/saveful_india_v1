import { IsArray, IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export class SearchMealsDto {
  @ApiPropertyOptional({
    description: 'List of ingredient names to search for',
    type: [String],
    example: ['chicken', 'rice'],
  })
  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @ApiPropertyOptional({
    description: 'Meal category name or partial match',
    type: String,
    example: 'breakfast',
  })
  @IsOptional()
  @IsString()
  mealCategory?: string;

  @ApiPropertyOptional({
    description: 'Difficulty level filter',
    enum: DifficultyLevel,
    example: 'EASY',
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({
    description: 'Maximum cooking time in minutes',
    type: Number,
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCookingTime?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    type: Number,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}