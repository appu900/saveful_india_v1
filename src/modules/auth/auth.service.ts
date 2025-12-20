import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/user-signup.dto';
import { v4 as uuid } from 'uuid';
import { LoginDto } from './dto/user.login.dto';
import { ChefSignupDto } from './dto/chef-signup.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private jwt: JwtService,
  ) {}

  private hash(data: string) {
    return bcrypt.hash(data, 12);
  }

  private compareHash(data: string, hash: string) {
    return bcrypt.compare(data, hash);
  }

  private async issueToken(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: '7d',
    });

    const refreshHash = await this.hash(refreshToken);

    await this.prismaService.tokenSet.upsert({
      where: { userId },
      update: { refreshHash: refreshHash },
      create: { userId, refreshHash: refreshHash },
    });

    return { accessToken, refreshToken };
  }
  async signup(dto: SignupDto) {
    const exists = await this.prismaService.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (exists)
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );

    if (dto.phoneNumber) {
      const existingByPhone = await this.prismaService.user.findUnique({
        where: {
          phoneNumber: dto.phoneNumber,
        },
      });

      if (existingByPhone) {
        throw new BadRequestException('Phone number already exists');
      }
    }
    const passwordHash = await this.hash(dto.password);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        phoneNumber: dto.phoneNumber,
        name: dto.name,
        role: 'USER',
        stateCode: dto.stateCode,
        dietaryProfile: {
          create: {
            vegType: dto.vegType,
            dairyFree: dto.dairyFree,
            nutFree: dto.nutFree,
            glutenFree: dto.glutenFree,
            hasDiabetes: dto.hasDiabetes,
            otherAllergies: dto.otherAllergies,
          },
        },
        tokenSet: { create: {} },
      },
    });
    return this.issueToken(user.id,user.role);
  }

  async createChef(dto: ChefSignupDto) {
    const exists = await this.prismaService.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (exists)
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );

    if (dto.phoneNumber) {
      const existingByPhone = await this.prismaService.user.findUnique({
        where: {
          phoneNumber: dto.phoneNumber,
        },
      });

      if (existingByPhone) {
        throw new BadRequestException('Phone number already exists');
      }
    }
    const passwordHash = await this.hash(dto.password);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        phoneNumber: dto.phoneNumber,
        name: dto.fullname,
        role: 'CHEF',
        tokenSet: { create: {} },
      },
    });
    return this.issueToken(user.id, user.role);
  }



    async createAdmin(dto:AdminSignupDto) {
    const exists = await this.prismaService.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (exists)
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );

    if (dto.phoneNumber) {
      const existingByPhone = await this.prismaService.user.findUnique({
        where: {
          phoneNumber: dto.phoneNumber,
        },
      });

      if (existingByPhone) {
        throw new BadRequestException('Phone number already exists');
      }
    }
    const passwordHash = await this.hash(dto.password);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        phoneNumber: dto.phoneNumber,
        name: dto.fullname,
        role: 'ADMIN',
        tokenSet: { create: {} },
      },
    });
    return this.issueToken(user.id, user.role);
  }

  async login(
    dto: LoginDto,
    deviceInfo?: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const passwordValid = await this.compareHash(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');
    await this.prismaService.userSession.create({
      data: {
        id: uuid(),
        userId: user.id,
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
      },
    });
    return this.issueToken(user.id, user.role);
  }

  async getMe(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        stateCode: true,
        dietaryProfile: true,
      },
    });
    return user;
  }

  async refresh(refreshToken: string) {
    try {
      // Verify and decode the refresh token to get userId
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      });

      const userId = payload.sub;
      const role = payload.role;

      // Get the stored token hash from database
      const tokenSet = await this.prismaService.tokenSet.findUnique({
        where: { userId },
      });

      if (!tokenSet || !tokenSet.refreshHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify the refresh token matches the stored hash
      const valid = await this.compareHash(refreshToken, tokenSet.refreshHash);
      if (!valid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Issue new tokens
      return this.issueToken(userId, role);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
