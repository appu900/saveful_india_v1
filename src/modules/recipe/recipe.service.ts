// recipe.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  SearchRecipesDto,
  BookmarkRecipeDto,
  RateRecipeDto,
} from './dto/recipe.dtos';
import { PrismaService } from '../../infra/database/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly SEARCH_CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}


  async createRecipe(dto: CreateRecipeDto) {
    this.logger.log(`Creating recipe: ${dto.name}`);
    console.log(dto)
    const slug = this.generateSlug(dto.name);

    // Check if slug already exists
    const existing = await this.prisma.recipe.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        `Recipe with name "${dto.name}" already exists`,
      );
    }

    // Collect all ingredient IDs
    const allIngredientIds = dto.ingredientCategories.flatMap((cat) =>
      cat.ingredients.map((ing) => ing.ingredientId),
    );

    // Fetch ingredients to compute dietary flags
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: allIngredientIds } },
    });

    if (ingredients.length !== allIngredientIds.length) {
      throw new BadRequestException('Some ingredients not found');
    }

    // Compute dietary flags
    const dietaryFlags = this.computeDietaryFlags(ingredients);

    // Prepare denormalized data
    const ingredientNames = ingredients.map((i) => i.name.toLowerCase());
    const ingredientSlugs = ingredients.map((i) => i.slug);
    const searchText = this.buildSearchText({
      name: dto.name,
      aboutThisDish: dto.aboutThisDish,
      proTip: dto.proTip,
      ingredientNames: ingredients.map((i) => i.name),
    });

    // Create recipe with nested relations
    const recipe = await this.prisma.recipe.create({
      data: {
        name: dto.name,
        slug,
        portions: dto.portions,
        prepAndCookTime: dto.prepAndCookTime,
        imageUrl: dto.imageUrl,
        aboutThisDish: dto.aboutThisDish,
        proTip: dto.proTip,
        savingTechnique: dto.savingTechnique,
        youtubeUrl: dto.youtubeUrl,
        difficulty: dto.difficulty,
        recipeType: dto.recipeType,

        // Dietary flags
        ...dietaryFlags,

        // Denormalized data
        ingredientIds: allIngredientIds,
        ingredientNames,
        ingredientSlugs,
        searchText,

        // Create ingredient categories with ingredients
        ingredientCategories: {
          create: dto.ingredientCategories.map((cat, catIndex) => ({
            categoryName: cat.categoryName,
            sortOrder: cat.sortOrder ?? catIndex,
            ingredients: {
              create: cat.ingredients.map((ing, ingIndex) => ({
                ingredientId: ing.ingredientId,
                quantity: ing.quantity,
                isOptional: ing.isOptional ?? false,
                sortOrder: ing.sortOrder ?? ingIndex,
              })),
            },
          })),
        },

        // Create cooking steps
        cookingSteps: {
          create: dto.cookingSteps.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title || '',
            instruction: step.instruction,
            imageUrl: step.imageUrl,
          })),
        },
      },
      include: {
        ingredientCategories: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        cookingSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        region: true,
      },
    });

    // Invalidate all caches
    await this.invalidateAllCaches();

    this.logger.log(`Recipe created: ${recipe.id}`);
    return recipe;
  }


  async getRecipeById(id: string) {
    const cacheKey = `recipe:${id}`;

    // Try cache
    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      console.log('fetched from cache:', cachedStr);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredientCategories: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        cookingSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        region: true,
        bookmarkedByUsers: {
          select: {
            userId: true,
            createdAt: true,
          },
          take: 10,
        },
        cookedByUsers: {
          select: {
            userId: true,
            rating: true,
            cookedAt: true,
          },
          orderBy: { cookedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    // Increment view count async
    this.incrementViewCount(id).catch((err) =>
      this.logger.error(`Failed to increment view count: ${err.message}`),
    );

    // Cache the result
    try {
      const serialized = JSON.stringify(recipe);
      await this.redisService.set(cacheKey, serialized, this.CACHE_TTL);
      console.log('cache set for recipe:', cacheKey);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return recipe;
  }

  async getRecipeBySlug(slug: string) {
    const cacheKey = `recipe:slug:${slug}`;

    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { slug },
      include: {
        ingredientCategories: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        cookingSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        region: true,
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with slug "${slug}" not found`);
    }

    this.incrementViewCount(recipe.id).catch((err) =>
      this.logger.error(`Failed to increment view count: ${err.message}`),
    );

    try {
      const serialized = JSON.stringify(recipe);
      await this.redisService.set(cacheKey, serialized, this.CACHE_TTL);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return recipe;
  }

  async getAllRecipes(limit = 20, offset = 0) {
    const cacheKey = `recipes:all:${limit}:${offset}`;

    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        select: this.getRecipeListSelect(),
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.recipe.count(),
    ]);

    const result = {
      recipes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    try {
      const serialized = JSON.stringify(result);
      await this.redisService.set(cacheKey, serialized, this.CACHE_TTL);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return result;
  }

  async getPopularRecipes(limit = 10) {
    const cacheKey = `recipes:popular:${limit}`;

    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    const recipes = await this.prisma.recipe.findMany({
      select: this.getRecipeListSelect(),
      orderBy: [
        { cookCount: 'desc' },
        { bookmarkCount: 'desc' },
        { avgRating: 'desc' },
      ],
      take: limit,
    });

    try {
      const serialized = JSON.stringify(recipes);
      await this.redisService.set(cacheKey, serialized, this.CACHE_TTL);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return recipes;
  }

  async getRecipesByType(recipeType: string, limit = 20, offset = 0) {
    const cacheKey = `recipes:type:${recipeType}:${limit}:${offset}`;

    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where: { recipeType: recipeType as any },
        select: this.getRecipeListSelect(),
        orderBy: [{ avgRating: 'desc' }, { cookCount: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.recipe.count({
        where: { recipeType: recipeType as any },
      }),
    ]);

    const result = {
      recipes,
      recipeType,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };

    try {
      const serialized = JSON.stringify(result);
      await this.redisService.set(cacheKey, serialized, this.CACHE_TTL);
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return result;
  }



  async searchRecipesByIngredients(dto: SearchRecipesDto) {
    const cacheKey = this.generateCacheKey('search', dto);

    // Try cache
    let cached: any;
    try {
      const cachedStr = await this.redisService.get(cacheKey);
      if (cachedStr) {
        cached = JSON.parse(cachedStr);
        this.logger.debug(`Search Cache HIT`);
        return cached;
      }
    } catch (error) {
      this.logger.error(`Failed to get from cache: ${cacheKey}`, error);
    }

    this.logger.debug(`Search Cache MISS`);

    // Parse ingredient IDs
    const ingredientIds = dto.ingredientIds
      ? dto.ingredientIds.split(',').map((id) => id.trim())
      : [];

    // Build WHERE clause
    const where: any = { AND: [] };

    // 1. Filter by ingredients (uses GIN index for array overlap)
    if (ingredientIds.length > 0) {
      where.AND.push({
        ingredientIds: {
          hasSome: ingredientIds,
        },
      });
    }

    // 2. Filter by recipe type
    if (dto.recipeType) {
      where.AND.push({ recipeType: dto.recipeType });
    }

    // 3. Filter by difficulty
    if (dto.difficulty) {
      where.AND.push({ difficulty: dto.difficulty });
    }

    // 4. Dietary filters
    if (dto.isVeg === 'true') {
      where.AND.push({ isVeg: true });
    }
    if (dto.isVegan === 'true') {
      where.AND.push({ isVegan: true });
    }
    if (dto.dairyFree === 'true') {
      where.AND.push({ dairyFree: true });
    }
    if (dto.nutFree === 'true') {
      where.AND.push({ nutFree: true });
    }
    if (dto.glutenFree === 'true') {
      where.AND.push({ glutenFree: true });
    }

    // 5. Text search (uses trigram GIN index)
    if (dto.searchText) {
      where.AND.push({
        OR: [
          { searchText: { contains: dto.searchText.toLowerCase() } },
          { name: { contains: dto.searchText, mode: 'insensitive' } },
        ],
      });
    }

    // Clean up empty AND
    if (where.AND.length === 0) {
      delete where.AND;
    }

    const limit = dto.limit || 20;
    const offset = dto.offset || 0;

    // Execute search
    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        select: this.getRecipeListSelect(),
        orderBy: [
          { avgRating: 'desc' },
          { cookCount: 'desc' },
          { bookmarkCount: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    const result = {
      recipes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        ingredientIds,
        recipeType: dto.recipeType,
        difficulty: dto.difficulty,
        searchText: dto.searchText,
      },
    };

    // Cache search results for 5 minutes
    try {
      const serialized = JSON.stringify(result);
      await this.redisService.set(
        cacheKey,
        serialized,
        this.SEARCH_CACHE_TTL,
      );
    } catch (error) {
      this.logger.error(`Failed to set cache: ${cacheKey}`, error);
    }

    return result;
  }



  async updateRecipe(id: string, dto: UpdateRecipeDto) {
    this.logger.log(`Updating recipe: ${id}`);

    const existing = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    const updateData: any = {};

    // Update basic fields
    if (dto.name) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
    }
    if (dto.portions !== undefined) updateData.portions = dto.portions;
    if (dto.prepAndCookTime !== undefined)
      updateData.prepAndCookTime = dto.prepAndCookTime;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.aboutThisDish) updateData.aboutThisDish = dto.aboutThisDish;
    if (dto.proTip) updateData.proTip = dto.proTip;
    if (dto.savingTechnique !== undefined)
      updateData.savingTechnique = dto.savingTechnique;
    if (dto.youtubeUrl !== undefined) updateData.youtubeUrl = dto.youtubeUrl;
    if (dto.difficulty) updateData.difficulty = dto.difficulty;
    if (dto.recipeType) updateData.recipeType = dto.recipeType;
    if (dto.regionId !== undefined) updateData.regionId = dto.regionId;

    // Update ingredient categories
    if (dto.ingredientCategories) {
      // Delete old categories and ingredients
      await this.prisma.recipeIngredientCategory.deleteMany({
        where: { recipeId: id },
      });

      // Collect all ingredient IDs
      const allIngredientIds = dto.ingredientCategories.flatMap((cat) =>
        cat.ingredients.map((ing) => ing.ingredientId),
      );

      // Fetch ingredients
      const ingredients = await this.prisma.ingredient.findMany({
        where: { id: { in: allIngredientIds } },
      });

      if (ingredients.length !== allIngredientIds.length) {
        throw new BadRequestException('Some ingredients not found');
      }

      // Recompute dietary flags and denormalized data
      const dietaryFlags = this.computeDietaryFlags(ingredients);
      const ingredientNames = ingredients.map((i) => i.name.toLowerCase());
      const ingredientSlugs = ingredients.map((i) => i.slug);

      updateData.ingredientIds = allIngredientIds;
      updateData.ingredientNames = ingredientNames;
      updateData.ingredientSlugs = ingredientSlugs;
      updateData.isVeg = dietaryFlags.isVeg;
      updateData.isVegan = dietaryFlags.isVegan;
      updateData.dairyFree = dietaryFlags.dairyFree;
      updateData.nutFree = dietaryFlags.nutFree;
      updateData.glutenFree = dietaryFlags.glutenFree;

      // Create new categories
      updateData.ingredientCategories = {
        create: dto.ingredientCategories.map((cat, catIndex) => ({
          categoryName: cat.categoryName,
          sortOrder: cat.sortOrder ?? catIndex,
          ingredients: {
            create: cat.ingredients.map((ing, ingIndex) => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              isOptional: ing.isOptional ?? false,
              sortOrder: ing.sortOrder ?? ingIndex,
            })),
          },
        })),
      };
    }

    // Update cooking steps
    if (dto.cookingSteps) {
      // Delete old steps
      await this.prisma.cookingStep.deleteMany({
        where: { recipeId: id },
      });

      // Create new steps
      updateData.cookingSteps = {
        create: dto.cookingSteps.map((step) => ({
          stepNumber: step.stepNumber,
          title: step.title || '',
          instruction: step.instruction,
          imageUrl: step.imageUrl,
        })),
      };
    }

    // Rebuild search text if needed
    if (
      dto.name ||
      dto.aboutThisDish ||
      dto.proTip ||
      dto.ingredientCategories
    ) {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id },
        include: {
          ingredientCategories: {
            include: {
              ingredients: {
                include: { ingredient: true },
              },
            },
          },
        },
      });

      if (!recipe) {
        throw new NotFoundException(`Recipe with ID ${id} not found`);
      }

      const ingredientNames = recipe.ingredientCategories.flatMap((cat) =>
        cat.ingredients.map((ing) => ing.ingredient.name),
      );

      updateData.searchText = this.buildSearchText({
        name: dto.name || recipe.name,
        aboutThisDish: dto.aboutThisDish || recipe.aboutThisDish,
        proTip: dto.proTip || recipe.proTip,
        ingredientNames,
      });
    }

    // Update the recipe
    const updated = await this.prisma.recipe.update({
      where: { id },
      data: updateData,
      include: {
        ingredientCategories: {
          include: {
            ingredients: {
              include: { ingredient: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        cookingSteps: {
          orderBy: { stepNumber: 'asc' },
        },
        region: true,
      },
    });

    // Invalidate caches
    await this.invalidateCacheForRecipe(id, existing.slug);

    this.logger.log(`Recipe updated: ${id}`);
    return updated;
  }



  async deleteRecipe(id: string) {
    this.logger.log(`Deleting recipe: ${id}`);

    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    await this.prisma.recipe.delete({
      where: { id },
    });

    await this.invalidateCacheForRecipe(id, recipe.slug);

    this.logger.log(`Recipe deleted: ${id}`);
  }



  async bookmarkRecipe(userId: string, dto: BookmarkRecipeDto) {
    // Check if recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if already bookmarked
    const existing = await this.prisma.bookmarkedRecipe.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId: dto.recipeId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Recipe already bookmarked');
    }

    // Create bookmark
    const bookmark = await this.prisma.bookmarkedRecipe.create({
      data: {
        userId,
        recipeId: dto.recipeId,
      },
    });

    // Increment bookmark count
    await this.prisma.recipe.update({
      where: { id: dto.recipeId },
      data: { bookmarkCount: { increment: 1 } },
    });

    // Invalidate recipe cache
    await this.redisService.del(`recipe:${dto.recipeId}`);

    return bookmark;
  }

  async removeBookmark(userId: string, recipeId: string) {
    const bookmark = await this.prisma.bookmarkedRecipe.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.bookmarkedRecipe.delete({
      where: { id: bookmark.id },
    });

    // Decrement bookmark count
    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: { bookmarkCount: { decrement: 1 } },
    });

    // Invalidate cache
    await this.redisService.del(`recipe:${recipeId}`);
  }

  async getUserBookmarks(userId: string, limit = 20, offset = 0) {
    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmarkedRecipe.findMany({
        where: { userId },
        include: {
          recipe: {
            select: this.getRecipeListSelect(),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.bookmarkedRecipe.count({ where: { userId } }),
    ]);

    return {
      bookmarks: bookmarks.map((b) => b.recipe),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }


  async rateRecipe(userId: string, dto: RateRecipeDto) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Create or update cooked recipe
    const cooked = await this.prisma.cookedRecipe.create({
      data: {
        userId,
        recipeId: dto.recipeId,
        rating: dto.rating,
        notes: dto.notes,
      },
    });

    // Increment cook count
    await this.prisma.recipe.update({
      where: { id: dto.recipeId },
      data: { cookCount: { increment: 1 } },
    });

    // Recalculate average rating
    await this.recalculateAvgRating(dto.recipeId);

    // Invalidate cache
    await this.redisService.del(`recipe:${dto.recipeId}`);

    return cooked;
  }



  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  private computeDietaryFlags(ingredients: any[]) {
    return {
      isVeg: ingredients.every((i) => i.isVeg),
      isVegan: ingredients.every((i) => i.isVegan),
      dairyFree: !ingredients.some((i) => i.isDairy),
      nutFree: !ingredients.some((i) => i.isNut),
      glutenFree: !ingredients.some((i) => i.isGluten),
      diabetesFriendly: false,
    };
  }

  private buildSearchText(data: {
    name: string;
    aboutThisDish: string;
    proTip: string;
    ingredientNames: string[];
  }): string {
    return [data.name, data.aboutThisDish, data.proTip, ...data.ingredientNames]
      .join(' ')
      .toLowerCase();
  }

  private async incrementViewCount(id: string) {
    await this.prisma.recipe.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  private async recalculateAvgRating(recipeId: string) {
    const ratings = await this.prisma.cookedRecipe.findMany({
      where: { recipeId, rating: { not: null } },
      select: { rating: true },
    });

    if (ratings.length === 0) return;

    const avg =
      ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length;

    await this.prisma.recipe.update({
      where: { id: recipeId },
      data: { avgRating: avg },
    });
  }

  private generateCacheKey(prefix: string, data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return `${prefix}:${Buffer.from(normalized).toString('base64').substring(0, 80)}`;
  }

  private getRecipeListSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      portions: true,
      prepAndCookTime: true,
      difficulty: true,
      recipeType: true,
      isVeg: true,
      isVegan: true,
      dairyFree: true,
      nutFree: true,
      glutenFree: true,
      cookCount: true,
      bookmarkCount: true,
      avgRating: true,
      createdAt: true,
    };
  }

  private async invalidateCacheForRecipe(id: string, slug: string) {
    await Promise.all([
      this.redisService.del(`recipe:${id}`),
      this.redisService.del(`recipe:slug:${slug}`),
    ]);
    await this.invalidateAllCaches();
  }

  private async invalidateAllCaches() {
    // Reset all caches to ensure fresh data
    try {
      await this.redisService.getClient().flushAll();
      this.logger.log('All caches invalidated');
    } catch (error) {
      this.logger.error('Failed to invalidate all caches', error);
    }
  }
}
