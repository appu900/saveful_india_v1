import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
import { CreateHackCategoryDto } from './dto/create-hack-category.dto';
import { RedisService } from '../../infra/cache/redis.service';

@Injectable()
export class HackService {
  private readonly logger = new Logger(HackService.name);
  private readonly CACHE_PREFIX = 'Hacks:Category';
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  //   ** create hack category and invalidate cache **
  async createHackCategory(dto: CreateHackCategoryDto) {
    this.logger.log(`${this.CACHE_PREFIX}`);
    const cacheKey = `${this.CACHE_PREFIX}`;
    const category = await this.prisma.hackCategory.create({
      data: {
        name: dto.name,
        imageUrl: dto.imageUrl,
      },
    });
    this.logger.log(`Hack category created with ID: ${category.id}`);
    await this.redisService.cacheInvalidate(cacheKey);
    return category;
  }

  //   ** fetch all categories and cache them **
  async getAllCategory() {
    const cacheKey = `${this.CACHE_PREFIX}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const hacks = await this.prisma.hackCategory.findMany();
    console.log('Hacks fetched from DB:', hacks);
    await this.redisService.set(cacheKey, JSON.stringify(hacks));
    return hacks;
  }

  async getCategoryById(id: string) {
    const cacheKey = `${this.CACHE_PREFIX}:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const category = await this.prisma.hackCategory.findUnique({
      where: { id },
      include: { hacks: true },
    });
    await this.redisService.set(cacheKey, JSON.stringify(category));
    return category;
  }
}
