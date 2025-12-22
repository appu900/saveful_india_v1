import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
import {
  CreateIngredientDto,
  SearchIngredientsDto,
  UpdateIngredientDto,
} from './dto/ingrediants.dto';
import { Ingredient, IngredientType, Season, UserRole } from '@prisma/client';

import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';
import { createZstdDecompress } from 'zlib';

@Injectable()
export class IngrediantsService {
  private readonly logger = new Logger(IngrediantsService.name);
  private readonly CACHE_TTL = 7200;
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private s3Upload: S3ImageUploadService,
  ) {}

  async createIngredient(dto: CreateIngredientDto): Promise<Ingredient> {
    this.logger.log(`Creating ingredient: ${dto.name}`);
    const slug = this.generateSlug(dto.name);
    // Check if ingredient exists
    const existing = await this.prisma.ingredient.findFirst({
      where: {
        OR: [{ slug }, { name: { equals: dto.name, mode: 'insensitive' } }],
      },
    });
    if (existing) {
      throw new BadRequestException(`Ingredient "${dto.name}" already exists`);
    }
    const ingredient = await this.prisma.ingredient.create({
      data: {
        name: dto.name,
        slug,
        aliases: dto.aliases || [],
        imageUrl: dto.imageUrl,
        description: dto.description,
        nutritionInfo: dto.nutritionInfo ?? 'no information available',
        type: dto.type || IngredientType.OTHER,
        availableSeasons: dto.availableSeasons || [Season.ALL_SEASON],
        categoryId: dto.categoryId,
        isVeg: dto.isVeg ?? true,
        isVegan: dto.isVegan ?? true,
        isDairy: dto.isDairy ?? false,
        isNut: dto.isNut ?? false,
        isGluten: dto.isGluten ?? false,
        isFruit: dto.isFruit ?? false,
        isVegetable: dto.isVegetable ?? false,
        tags: dto.tags || [],
        addedBy: dto.addedBy || UserRole.ADMIN,
        isVerified:true,
      },
      include: {
        category: true,
      },
    });
    await this.invalidateCache();
    this.logger.log(`Ingredient created: ${ingredient.id}`);
    return ingredient;
  }

  async getIngredientById(id: string): Promise<Ingredient> {
    const cacheKey = `ingredient:${id}`;

    let cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        category: true,
        recipeIngredients: {
          take: 10,
        },
      },
    });
    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    await this.redis.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(ingredient),
    );
    return ingredient;
  }

  /**
   * GET INGREDIENT BY SLUG
   */
  async getIngredientBySlug(slug: string): Promise<Ingredient> {
    const cacheKey = `ingredient:slug:${slug}`;

    let cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });
    if (!ingredient) {
      throw new NotFoundException(`Ingredient with slug ${slug} not found`);
    }
    await this.redis.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(ingredient),
    );
    return ingredient;
  }

  /**
   * SEARCH INGREDIENTS (fuzzy matching with pg_trgm)
   */
  async searchIngredients(dto: SearchIngredientsDto) {
    const {
      query,
      type,
      season,
      categoryId,
      isVeg,
      isVegan,
      limit = 50,
      offset = 0,
    } = dto;
    const cacheKey = this.generateCacheKey('ingredient:search', dto);

    let cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const where: any = { AND: [] };
    // Fuzzy text search on name and aliases (uses trigram index)
    if (query) {
      where.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { aliases: { has: query.toLowerCase() } },
        ],
      });
    }
    // Filter by type
    if (type) {
      where.AND.push({ type });
    }
    // Filter by season
    if (season) {
      where.AND.push({
        availableSeasons: {
          has: season,
        },
      });
    }
    // Filter by category
    if (categoryId) {
      where.AND.push({ categoryId });
    }
    // Dietary filters
    if (isVeg !== undefined) {
      where.AND.push({ isVeg });
    }
    if (isVegan !== undefined) {
      where.AND.push({ isVegan });
    }
    if (where.AND.length === 0) {
      delete where.AND;
    }
    const [ingredients, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.ingredient.count({ where }),
    ]);
    const result = {
      ingredients,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /**
   *  UPDATE INGREDIENT
   */
  async updateIngredient(dto: UpdateIngredientDto): Promise<Ingredient> {
    const existing = await this.prisma.ingredient.findUnique({
      where: { id: dto.id },
    });
    if (!existing) {
      throw new NotFoundException(`Ingredient with ID ${dto.id} not found`);
    }
    // Delete old image if new image is provided
    if (
      dto.imageUrl &&
      existing.imageUrl &&
      dto.imageUrl !== existing.imageUrl
    ) {
      await this.s3Upload.deleteImage(existing.imageUrl);
    }
    const updateData: any = {};
    if (dto.name) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
    }
    if (dto.aliases !== undefined) updateData.aliases = dto.aliases;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.nutritionInfo !== undefined)
      updateData.nutritionInfo = dto.nutritionInfo;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.availableSeasons !== undefined)
      updateData.availableSeasons = dto.availableSeasons;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.isVeg !== undefined) updateData.isVeg = dto.isVeg;
    if (dto.isVegan !== undefined) updateData.isVegan = dto.isVegan;
    if (dto.isDairy !== undefined) updateData.isDairy = dto.isDairy;
    if (dto.isNut !== undefined) updateData.isNut = dto.isNut;
    if (dto.isGluten !== undefined) updateData.isGluten = dto.isGluten;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    const updated = await this.prisma.ingredient.update({
      where: { id: dto.id },
      data: updateData,
      include: {
        category: true,
      },
    });
    await this.invalidateCacheForIngredient(dto.id, existing.slug);
    this.logger.log(`Ingredient updated: ${dto.id}`);
    return updated;
  }

  /**
   *  VERIFY INGREDIENT (Admin only)
   */
  async verifyIngredient(id: string): Promise<Ingredient> {
    const ingredient = await this.prisma.ingredient.update({
      where: { id },
      data: { isVerified: true },
      include: { category: true },
    });
    await this.invalidateCacheForIngredient(id, ingredient.slug);
    return ingredient;
  }

  /**
   * 🗑️ DELETE INGREDIENT
   */
  async deleteIngredient(id: string): Promise<void> {
    this.logger.log(`Deleting ingredient: ${id}`);
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        recipeIngredients: true,
      },
    });
    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    if (ingredient.recipeIngredients.length > 0) {
      throw new BadRequestException(
        `Cannot delete ingredient "${ingredient.name}" - it is used in ${ingredient.recipeIngredients.length} recipe(s)`,
      );
    }
    // Delete image from S3 if exists
    if (ingredient.imageUrl) {
      await this.s3Upload.deleteImage(ingredient.imageUrl);
    }
    await this.prisma.ingredient.delete({
      where: { id },
    });
    await this.invalidateCacheForIngredient(id, ingredient.slug);
    this.logger.log(`Ingredient deleted: ${id}`);
  }

  /**
   * 📊 GET ALL INGREDIENT CATEGORIES
   */
  async getAllCategories() {
    const cacheKey = 'ingredient:categories:all';

    let cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    const categories = await this.prisma.ingredientCategory.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: { ingredients: true },
        },
      },
    });
    await this.redis.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(categories),
    );
    return categories;
  }

  private generateCacheKey(prefix: string, data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return `${prefix}:${Buffer.from(normalized).toString('base64').substring(0, 50)}`;
  }

  private async invalidateCacheForIngredient(id: string, slug: string) {
    await Promise.all([
      this.redis.del(`ingredient:${id}`),
      this.redis.del(`ingredient:slug:${slug}`),
    ]);
    await this.invalidateCache();
  }

  private async invalidateCache() {
    // Pattern-based cache invalidation for ingredient-related keys
    const keys = await this.redis.keys('ingredient:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get ingredients by season (with cache)
   */
  async getIngredientsBySeason(season: Season, limit: number = 50) {
    // const cacheKey = `ingredients:season:${season}:${limit}`;
    // const cached = await this.redis.get(cacheKey);
    // console.log(cached)
    // if (cached) return JSON.parse(cached);

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        availableSeasons: { has: season as Season },
        isVerified: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    // await this.redis.setex(cacheKey, 3600, JSON.stringify(ingredients)); // 1hr cache
    return ingredients;
  }

  async getIngredientByCategory(categoryId: string) {
    // const cacheKey = `ingredients_cat:${categoryId}data`;
    // const cached = await this.redis.get(cacheKey);
    // if (cached) return JSON.parse(cached);
    const ingrediants = await this.prisma.ingredientCategory.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        ingredients: {
          select: {
            name: true,
            id:true
          },
        },
      },
    });
    // ** cached code for all nodes
    // await this.redis.setex(cacheKey, 3600, JSON.stringify(ingrediants));
    return ingrediants;
  }

  /**
   * Get current season's ingredients
   */
  async getCurrentSeasonIngredients(limit: number = 50) {
    const currentSeason = this.getCurrentSeason();
    return this.getIngredientsBySeason(currentSeason, limit);
  }

  /**
   * Get vegetables only
   */
  async getVegetables(limit: number = 50) {
    return this.prisma.ingredient.findMany({
      where: { type: IngredientType.VEGETABLE, isVerified: true },
      take: limit,
    });
  }

  /**
   * Get fruits only
   */
  async getFruits(limit: number = 50) {
    return this.prisma.ingredient.findMany({
      where: { type: IngredientType.FRUIT, isVerified: true },
      take: limit,
    });
  }

  /**
   * Admin verifies chef-added ingredient
   */

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

  // ** this is reposible for fetching all the ingrediants caregories
  async fetchAllIngrediantsCategory() {
    console.log('service layer touched');
    return this.prisma.ingredientCategory.findMany();
  }

  async fetchAllIngrediants() {
    return this.prisma.ingredient.findMany({});
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
