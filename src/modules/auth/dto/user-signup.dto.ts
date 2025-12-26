import { IsEmail, IsOptional, IsString, MinLength, IsEnum, IsBoolean } from 'class-validator';

export enum VegType {
  OMNI = 'OMNI',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
}




export class SignupDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;


  @IsString()
  name: string;

  @IsString()
  stateCode: string;

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
  otherAllergies?: string[];
}
