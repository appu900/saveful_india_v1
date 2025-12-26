import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.startegy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/database/prisma.service';
import { ChefManagementController } from './chef-management.controller';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_TOKEN_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],

  controllers: [AuthController, ChefManagementController],
  providers: [AuthService, JwtStrategy, PrismaService, RolesGuard],
  exports: [RolesGuard],
})
export class AuthModule {}
