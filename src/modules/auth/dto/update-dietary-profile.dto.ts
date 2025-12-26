import { IsOptional, IsEnum, IsBoolean, IsArray, IsString } from 'class-validator';

export enum VegType {
  OMNI = 'OMNI',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
}

export class UpdateDietaryProfileDto {
  @IsOptional()
  @IsEnum(VegType)
  vegType?: VegType;

  @IsOptional()
  @IsBoolean()
  dairyFree?: boolean;

  @IsOptional()
  @IsBoolean()
  nutFree?: boolean;

  @IsOptional()
  @IsBoolean()
  glutenFree?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDiabetes?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherAllergies?: string[];
}
