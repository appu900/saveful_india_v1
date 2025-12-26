import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { chefs };
  }

  async getChefById(id: string) {
    const chef = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CHEF',
      },
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
      throw new NotFoundException('Chef not found');
    }

    return { chef };
  }

  async deleteChef(id: string) {
    const chef = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CHEF',
      },
    });

    if (!chef) {
      throw new NotFoundException('Chef not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'Chef deleted successfully' };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        stateCode: true,
        createdAt: true,
        updatedAt: true,
        dietaryProfile: {
          select: {
            vegType: true,
            dairyFree: true,
            nutFree: true,
            glutenFree: true,
            hasDiabetes: true,
            otherAllergies: true,
            updatedAt: true,
          },
        },
        onboarding: {
          select: {
            postcode: true,
            suburb: true,
            noOfAdults: true,
            noOfChildren: true,
            tastePreference: true,
            trackSurveyDay: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            cookedRecipes: true,
            bookmarkedRecipes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { users };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        stateCode: true,
        createdAt: true,
        updatedAt: true,
        dietaryProfile: {
          select: {
            vegType: true,
            dairyFree: true,
            nutFree: true,
            glutenFree: true,
            hasDiabetes: true,
            otherAllergies: true,
            updatedAt: true,
          },
        },
        onboarding: {
          select: {
            postcode: true,
            suburb: true,
            noOfAdults: true,
            noOfChildren: true,
            tastePreference: true,
            trackSurveyDay: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            cookedRecipes: true,
            bookmarkedRecipes: true,
            sessions: true,
          },
        },
        sessions: {
          select: {
            id: true,
            device: true,
            ipAddress: true,
            lastActivity: true,
            createdAt: true,
          },
          orderBy: {
            lastActivity: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'USER',
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async getUserStats() {
    const [totalUsers, totalChefs, usersWithDietaryProfile, usersWithOnboarding] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'CHEF' } }),
      this.prisma.userDietProfile.count(),
      this.prisma.userOnboarding.count(),
    ]);

    return {
      totalUsers,
      totalChefs,
      usersWithDietaryProfile,
      usersWithOnboarding,
      onboardingCompletionRate: totalUsers > 0 
        ? ((usersWithOnboarding / totalUsers) * 100).toFixed(2) + '%'
        : '0%',
      dietaryProfileCompletionRate: totalUsers > 0
        ? ((usersWithDietaryProfile / totalUsers) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}
