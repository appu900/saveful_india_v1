import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/user-signup.dto';
import { LoginDto } from './dto/user.login.dto';
import { RefreshTokenDto } from './dto/user.refreshToken.dto';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { ChefSignupDto } from './dto/chef-signup.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateDietaryProfileDto } from './dto/update-dietary-profile.dto';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getDeviceInfo(req: any) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('chef/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createChef(@Body() dto: ChefSignupDto, @GetUser() admin: any) {
    return this.authService.createChef(dto, admin.userId);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, this.getDeviceInfo(req));
  }

  @Post('admin/login')
  @HttpCode(200)
  adminLogin(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.roleBasedLogin(dto, 'ADMIN', this.getDeviceInfo(req));
  }

  @Post('chef/login')
  @HttpCode(200)
  chefLogin(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.roleBasedLogin(dto, 'CHEF', this.getDeviceInfo(req));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: any) {
    return this.authService.getMe(user.userId);
  }

  @Put('dietary-profile')
  @UseGuards(JwtAuthGuard)
  updateDietaryProfile(
    @GetUser() user: any,
    @Body() dto: UpdateDietaryProfileDto,
  ) {
    return this.authService.updateDietaryProfile(user.userId, dto);
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  createOnboarding(
    @GetUser() user: any,
    @Body() dto: CreateOnboardingDto,
  ) {
    return this.authService.createOnboarding(user.userId, dto);
  }

  @Get('onboarding')
  @UseGuards(JwtAuthGuard)
  getOnboarding(@GetUser() user: any) {
    return this.authService.getOnboarding(user.userId);
  }
}
