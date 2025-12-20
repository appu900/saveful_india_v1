import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  IsBoolean,
  isString,
} from 'class-validator';

export class AdminSignupDto {
  @IsString()
  fullname: string;

  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsString()
  phoneNumber: string;
}
