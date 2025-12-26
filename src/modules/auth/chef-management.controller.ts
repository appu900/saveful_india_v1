import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../infra/database/prisma.service';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('admin/chefs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ChefManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAllChefs() {
    const chefs = await this.prisma.user.findMany({
      where: { role: 'CHEF' },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      chefs,
      total: chefs.length,
    };
  }

  @Get(':id')
  async getChefById(@Param('id') id: string) {
    const chef = await this.prisma.user.findUnique({
      where: { id, role: 'CHEF' },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!chef) {
      return {
        success: false,
        message: 'Chef not found',
      };
    }

    return {
      success: true,
      chef,
    };
  }

  @Delete(':id')
  async deleteChef(@Param('id') id: string, @GetUser() admin: any) {
    const chef = await this.prisma.user.findUnique({
      where: { id, role: 'CHEF' },
    });

    if (!chef) {
      return {
        success: false,
        message: 'Chef not found',
      };
    }

    await this.prisma.tokenSet.deleteMany({
      where: { userId: id },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId: id },
    });

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Chef deleted successfully',
    };
  }
}
