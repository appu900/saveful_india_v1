import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
import { PrismaService } from '../../infra/database/prisma.service';
import { HackService } from './hack.service';
import { CreateHackCategoryDto } from './dto/create-hack-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoles } from '../../common/interfaces/user.role.interface';

@Controller('hack')
export class HackController {
  constructor(
    private readonly hackService: HackService,
    private readonly imageUploadService: S3ImageUploadService,
  ) {}

  @Post('category')
  @Roles('ADMIN', 'CHEF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createCategory(
    @Body() dto: CreateHackCategoryDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    // ** upload the image first
    let imageUrl = '';
    try {
      imageUrl = await this.imageUploadService.uploadHackImage(image);
    } catch (error) {
      throw new InternalServerErrorException('something went wrong');
    }
    dto.imageUrl = imageUrl;
    return this.hackService.createHackCategory(dto)
  }


  @Get('category')
  async fetchAllCategory(){
    return this.hackService.getAllCategory();
  }

  @Get('category/:id')
  async fetchCategoryById(@Param('id') id: string) {
    return this.hackService.getCategoryById(id)
  }
}
