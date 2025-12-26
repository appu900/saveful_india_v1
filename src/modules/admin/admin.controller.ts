import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Chef Management Endpoints
  @Get('chefs')
  getAllChefs() {
    return this.adminService.getAllChefs();
  }

  @Get('chefs/:id')
  getChefById(@Param('id') id: string) {
    return this.adminService.getChefById(id);
  }

  @Delete('chefs/:id')
  @HttpCode(200)
  deleteChef(@Param('id') id: string) {
    return this.adminService.deleteChef(id);
  }

  // User Management Endpoints
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Delete('users/:id')
  @HttpCode(200)
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // Stats Endpoint
  @Get('stats')
  getUserStats() {
    return this.adminService.getUserStats();
  }
}
