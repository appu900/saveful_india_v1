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
import { Ingredient } from '@prisma/client';

import { createIngrediantCategoryDto } from './dto/ingrediants.category.dto';

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
    this.logger.log('Received DTO:', JSON.stringify(dto, null, 2));
    
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
        nutritionInfo: dto.nutritionInfo ?? null,
        categoryId: dto.categoryId,
        isVeg: dto.isVeg ?? false,
        isVegan: dto.isVegan ?? false,
        isDairy: dto.isDairy ?? false,
        isNut: dto.isNut ?? false,
        isGluten: dto.isGluten ?? false,
        hasPage: dto.hasPage ?? false,
        tags: dto.tags || [],
        theme: dto.theme,
        inSeasonMonths: dto.inSeasonMonths || [],
        isPantryItem: dto.isPantryItem ?? false,
        averageWeight: dto.averageWeight ?? null,
        isVerified: true,
      },
      include: {
        category: true,
      },
    });
    await this.invalidateCache();
    this.logger.log(`Ingredient created: ${ingredient.id}`);
    return ingredient;
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    this.logger.log(`Updating ingredient: ${id}`);
    this.logger.log('Received DTO:', JSON.stringify(dto, null, 2));
    
    this.logger.log('Boolean values in DTO:', {
      isVeg: dto.isVeg,
      isVegan: dto.isVegan,
      isDairy: dto.isDairy,
      isNut: dto.isNut,
      isGluten: dto.isGluten,
      hasPage: dto.hasPage,
      isPantryItem: dto.isPantryItem,
    });
    
    // Check if ingredient exists
    const existing = await this.prisma.ingredient.findUnique({
      where: { id },
    });
    
    if (!existing) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }

    // Check if name is being changed and if new name already exists
    if (dto.name && dto.name !== existing.name) {
      const nameExists = await this.prisma.ingredient.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (nameExists) {
        throw new BadRequestException(`Ingredient "${dto.name}" already exists`);
      }
    }

    const slug = dto.name ? this.generateSlug(dto.name) : existing.slug;

    const ingredient = await this.prisma.ingredient.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
        aliases: dto.aliases ?? existing.aliases,
        imageUrl: dto.imageUrl ?? existing.imageUrl,
        description: dto.description ?? existing.description,
        nutritionInfo: dto.nutritionInfo ?? existing.nutritionInfo,
        categoryId: dto.categoryId ?? existing.categoryId,
        isVeg: dto.isVeg !== undefined ? dto.isVeg : existing.isVeg,
        isVegan: dto.isVegan !== undefined ? dto.isVegan : existing.isVegan,
        isDairy: dto.isDairy !== undefined ? dto.isDairy : existing.isDairy,
        isNut: dto.isNut !== undefined ? dto.isNut : existing.isNut,
        isGluten: dto.isGluten !== undefined ? dto.isGluten : existing.isGluten,
        hasPage: dto.hasPage !== undefined ? dto.hasPage : existing.hasPage,
        tags: dto.tags ?? existing.tags,
        theme: dto.theme ?? existing.theme,
        inSeasonMonths: dto.inSeasonMonths ?? existing.inSeasonMonths,
        isPantryItem: dto.isPantryItem ?? existing.isPantryItem,
        averageWeight: dto.averageWeight ?? existing.averageWeight,
      },
      include: {
        category: true,
      },
    });

    await this.invalidateCache();
    this.logger.log(`Ingredient updated: ${ingredient.id}`);
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
    await this.redis.set(
      cacheKey,
      JSON.stringify(ingredient),
      this.CACHE_TTL,
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
    await this.redis.set(
      cacheKey,
      JSON.stringify(ingredient),
      this.CACHE_TTL,
    );
    return ingredient;
  }

  /**
   * SEARCH INGREDIENTS (fuzzy matching with pg_trgm)
   */
  async searchIngredients(dto: SearchIngredientsDto) {
    const {
      query,
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
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
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
  async deleteIngredient(id: string): Promise<{ success: boolean; message: string }> {
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
    return { success: true, message: 'Ingredient deleted successfully' };
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
    await this.redis.set(
      cacheKey,
      JSON.stringify(categories),
      this.CACHE_TTL,
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

  // ** update ingredient category
  async updateIngrediantsCategory(id: string, dto: createIngrediantCategoryDto) {
    const category = await this.prisma.ingredientCategory.findUnique({
      where: { id },
    });
    
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if name already exists (excluding current category)
    const existingCategory = await this.prisma.ingredientCategory.findFirst({
      where: {
        name: dto.name,
        NOT: { id },
      },
    });

    if (existingCategory) {
      throw new ConflictException('A category with this name already exists');
    }

    const updatedCategory = await this.prisma.ingredientCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return updatedCategory;
  }

  // ** delete ingredient category
  async deleteIngrediantsCategory(id: string) {
    const category = await this.prisma.ingredientCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ingredients: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has ingredients
    if (category._count.ingredients > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it contains ${category._count.ingredients} ingredient(s). Please reassign or delete the ingredients first.`
      );
    }

    await this.prisma.ingredientCategory.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Category "${category.name}" has been deleted successfully`,
    };
  }

  async fetchAllIngrediants() {
    const ingredients = await this.prisma.ingredient.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { ingredients };
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
