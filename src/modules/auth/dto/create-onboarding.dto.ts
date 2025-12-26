import { IsString, IsInt, IsArray, IsOptional, Min } from 'class-validator';

export class CreateOnboardingDto {
  @IsString()
  postcode: string; // Country code

  @IsString()
  suburb: string; // Country name

  @IsInt()
  @Min(0)
  noOfAdults: number;

  @IsInt()
  @Min(0)
  noOfChildren: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tastePreference?: string[];

  @IsString()
  @IsOptional()
  trackSurveyDay?: string;
}
