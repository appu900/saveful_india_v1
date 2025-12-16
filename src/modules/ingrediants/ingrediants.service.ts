import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
import { CreateIngredientDto } from './dto/ingrediants.dto';
import { Season } from '@prisma/client';
import { UpdateIngredientDto } from '../meals/dto/meals.dto';
import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';
import { createZstdDecompress } from 'zlib';

@Injectable()
export class IngrediantsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private s3Upload: S3ImageUploadService,
  ) {}

  /**
   * Admin creates ingredient with image
   */
  async createIngredient(
    data: CreateIngredientDto,
    imageFile: Express.Multer.File,
    adminId: string,
  ) {
    // Upload image to S3
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.s3Upload.uploadIngredientImage(imageFile);
    }

    console.log(data);
    console.log(imageUrl);

    const categoryExists = await this.prisma.ingredientCategory.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });

    if (!categoryExists) {
      throw new BadRequestException('category does not exists');
    }

    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: data.name,
        slug: this.generateSlug(data.name),
        aliases: data.aliases || [],
        imageUrl,
        description: data.description,
        nutritionInfo: data.nutritionInfo,
        type: data.type || 'OTHER',
        isVegetable: data.isVegetable || false,
        isFruit: data.isFruit || false,
        availableSeasons: data.availableSeasons || ['ALL_SEASON'],
        categoryId: categoryExists.id,
        isVeg: data.isVeg ?? true,
        isVegan: data.isVegan ?? true,
        isDairy: data.isDairy ?? false,
        isNut: data.isNut ?? false,
        isGluten: data.isGluten ?? false,
        tags: data.tags || [],
        addedBy: 'ADMIN',
        isVerified: true,
      },
    });

    // Clear cache
    await this.clearIngredientCaches();

    return ingredient;
  }

  /**
   * Chef adds ingredient (needs admin verification)
   */
  async chefAddIngredient(
    data: CreateIngredientDto,
    imageFile: Express.Multer.File,
    chefId: string,
  ) {
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.s3Upload.uploadIngredientImage(imageFile);
    }

    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: data.name,
        slug: this.generateSlug(data.name),
        imageUrl,
        description: data.description,
        type: data.type || 'OTHER',
        isVegetable: data.isVegetable || false,
        isFruit: data.isFruit || false,
        addedBy: 'CHEF',
        isVerified: false, // Needs admin verification
        // ... other fields
      },
    });

    return ingredient;
  }

  /**
   * Get ingredients by season (with cache)
   */
  async getIngredientsBySeason(season: Season, limit: number = 50) {
    const cacheKey = `ingredients:season:${season}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        availableSeasons: { has: season },
        isVerified: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    await this.redis.setex(cacheKey, 3600, JSON.stringify(ingredients)); // 1hr cache
    return ingredients;
  }

  /**
   * Get current season's ingredients
   */
  async getCurrentSeasonIngredients(limit: number = 50) {
    const currentSeason = this.getCurrentSeason();
    return this.getIngredientsBySeason(currentSeason, limit);
  }

  /**
   * Search ingredients with fuzzy matching
   */
  async searchIngredients(query: string, limit: number = 20) {
    const cacheKey = `ingredients:search:${query}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Using PostgreSQL trigram similarity
    const ingredients = await this.prisma.$queryRaw`
      SELECT 
        id, name, slug, "imageUrl", description, type,
        "isVegetable", "isFruit", "availableSeasons",
        similarity(name, ${query}) as sim
      FROM "Ingredient"
      WHERE 
        "isVerified" = true
        AND (
          name ILIKE ${`%${query}%`}
          OR ${query} = ANY(aliases)
        )
      ORDER BY 
        CASE 
          WHEN name ILIKE ${`${query}%`} THEN 1
          WHEN name ILIKE ${`%${query}%`} THEN 2
          ELSE 3
        END,
        similarity(name, ${query}) DESC
      LIMIT ${limit}
    `;

    await this.redis.setex(cacheKey, 1800, JSON.stringify(ingredients));
    return ingredients;
  }

  /**
   * Get vegetables only
   */
  async getVegetables(limit: number = 50) {
    return this.prisma.ingredient.findMany({
      where: { isVegetable: true, isVerified: true },
      take: limit,
    });
  }

  /**
   * Get fruits only
   */
  async getFruits(limit: number = 50) {
    return this.prisma.ingredient.findMany({
      where: { isFruit: true, isVerified: true },
      take: limit,
    });
  }

  /**
   * Admin verifies chef-added ingredient
   */
  async verifyIngredient(ingredientId: string, adminId: string) {
    return this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: { isVerified: true },
    });
  }

  /**
   * create ingredinats category
   */

  async createIngrediantsCategory(dto: createIngrediantCategoryDto) {
    const alreadyExists = await this.prisma.ingredientCategory.findFirst({
      where: {
        name: dto.name,
      },
    });
    if (alreadyExists) {
      throw new ConflictException('This Category already exits');
    }
    const createdCategory = await this.prisma.ingredientCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
    return createdCategory;
  }

  async fetchAllIngrediantsCategory() {
    return this.prisma.ingredientCategory.findMany({});
  }

  /**
   * Update ingredient with new image
   */
  async updateIngredient(
    ingredientId: string,
    data: UpdateIngredientDto,
    imageFile: Express.Multer.File,
  ) {
    const existing = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!existing) {
      throw new NotFoundException('Ingredient not found');
    }

    // Upload new image
    let imageUrl = existing.imageUrl;
    if (imageFile) {
      imageUrl = await this.s3Upload.uploadIngredientImage(imageFile);

      // Delete old image
      if (existing.imageUrl) {
        await this.s3Upload.deleteImage(existing.imageUrl);
      }
    }

    const updated = await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        ...data,
        imageUrl,
      },
    });

    await this.clearIngredientCaches();
    return updated;
  }

  private getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1; // 1-12

    if (month >= 3 && month <= 5) return 'SPRING';
    if (month >= 6 && month <= 8) return 'SUMMER';
    if (month >= 9 && month <= 11) return 'FALL';
    return 'WINTER';
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async clearIngredientCaches() {
    const keys = await this.redis.keys('ingredients:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
