import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/user-signup.dto';
import { LoginDto } from './dto/user.login.dto';
import { RefreshTokenDto } from './dto/user.refreshToken.dto';
import { JwtAuthGuard } from './guards/jwt.auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
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
  me(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
