import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/user-signup.dto';
import { LoginDto } from './dto/user.login.dto';
import { RefreshTokenDto } from './dto/user.refreshToken.dto';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../common/guards/rate-limit.guard';
import { ChefSignupDto } from './dto/chef-signup.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AdminSignupDto } from './dto/admin-signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('/chef/signup')
  createChef(@Body() dto: ChefSignupDto) {
    return this.authService.createChef(dto);
  }

  @Post('/admin/signup')
  createAdmin(@Body() dto: AdminSignupDto) {
    return this.authService.createAdmin(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: any) {
    const device = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };
    return this.authService.login(dto, device);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    const userId = req.body.userId;
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: any) {
    const userId = user.userId;
    console.log(userId);
    return this.authService.getMe(userId);
  }

  @Get('test')
  @RateLimit(3, 60000)
  @UseGuards(RateLimitGuard)
  startTest() {
    return 'hello appu';
  }
}
