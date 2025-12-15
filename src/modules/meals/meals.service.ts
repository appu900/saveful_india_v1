import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { RedisService } from '../../infra/cache/redis.service';
import { S3ImageUploadService } from '../s3-image-uoload/s3-image-uoload.service';
import { CreateMealDto, IngredientInputDto, UpdateMealDto } from './dto/meals.dto';

@Injectable()
export class MealsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private s3Upload: S3ImageUploadService,
  ) {}

  // Create meal with image upload
  async createMeal(
    dto: CreateMealDto,
    chefId: string,
    imageFile?: Express.Multer.File,
  ) {
    // 1. Upload image to S3 if provided
    let imageUrl = dto.imageUrl; // Use provided URL if no file

    if (imageFile) {
      imageUrl = await this.s3Upload.uploadMealImage(imageFile);
    }

    if (!imageUrl) {
      throw new BadRequestException('Meal image is required');
    }

    // 2. Process ingredients
    const processedIngredients = await this.processIngredients(dto.ingredients);

    // 3. Generate slug
    const slug = this.generateSlug(dto.title);

    // 4. Check if slug exists
    const existing = await this.prisma.meal.findUnique({ where: { slug } });
    if (existing) {
      // Delete uploaded image if meal creation fails
      if (imageFile) {
        await this.s3Upload.deleteImage(imageUrl);
      }
      throw new BadRequestException(
        `Meal with title "${dto.title}" already exists`,
      );
    }

    // 5. Calculate dietary flags
    const dietaryFlags = this.calculateDietaryFlags(
      processedIngredients.ingredients,
    );

    // 6. Prepare ingredient arrays
    const ingredientIds = processedIngredients.ingredients.map((i) => i.id);
    const ingredientNames = processedIngredients.ingredients.map((i) =>
      i.name.toLowerCase(),
    );
    const ingredientSlugs = processedIngredients.ingredients.map((i) => i.slug);

    // 7. Create searchText
    const searchText = `${dto.title} ${dto.shortDescription || ''} ${ingredientNames.join(' ')}`;

    try {
      // 8. Create meal
      const meal = await this.prisma.meal.create({
        data: {
          title: dto.title,
          slug,
          shortDescription: dto.shortDescription,
          instructions: dto.instructions,
          imageUrl, // S3 URL
          cookingTimeMinutes: dto.cookingTimeMinutes,
          difficulty: dto.difficulty || 'MEDIUM',
          mealCategoryId: dto.mealCategoryId,
          regionId: dto.regionId,
          ingredientIds,
          ingredientNames,
          ingredientSlugs,
          ...dietaryFlags,
          diabetesFriendly: dto.diabetesFriendly || false,
          searchText,
        },
        include: {
          mealCategory: true,
          region: true,
        },
      });

      // 9. Store ingredient details
      await this.storeMealIngredients(meal.id, processedIngredients.details);

      // 10. Clear cache
      await this.clearMealCaches();

      return {
        ...meal,
        ingredients: processedIngredients.details,
      };
    } catch (error) {
      // If meal creation fails, delete uploaded image
      if (imageFile && imageUrl) {
        await this.s3Upload.deleteImage(imageUrl);
      }
      throw error;
    }
  }

  // Update meal with optional new image
  async updateMeal(
    mealId: string,
    dto: UpdateMealDto,
    chefId: string,
    imageFile?: Express.Multer.File,
  ) {
    // 1. Check if meal exists
    const existingMeal = await this.prisma.meal.findUnique({
      where: { id: mealId },
    });

    if (!existingMeal) {
      throw new NotFoundException('Meal not found');
    }

    // 2. Upload new image if provided
    let imageUrl = dto.imageUrl || existingMeal.imageUrl;
    const oldImageUrl = existingMeal.imageUrl;

    if (imageFile) {
      imageUrl = await this.s3Upload.uploadMealImage(imageFile);
    }

    // 3. Process ingredients if provided
    let ingredientData: any = null;
    let dietaryFlags: any = null;

    if (dto.ingredients) {
      const processedIngredients = await this.processIngredients(
        dto.ingredients,
      );
      dietaryFlags = this.calculateDietaryFlags(
        processedIngredients.ingredients,
      );

      ingredientData = {
        ingredientIds: processedIngredients.ingredients.map((i) => i.id),
        ingredientNames: processedIngredients.ingredients.map((i) =>
          i.name.toLowerCase(),
        ),
        ingredientSlugs: processedIngredients.ingredients.map((i) => i.slug),
      };

      await this.storeMealIngredients(mealId, processedIngredients.details);
    }

    // 4. Generate new slug if title changed
    let slug = existingMeal.slug;
    if (dto.title && dto.title !== existingMeal.title) {
      slug = this.generateSlug(dto.title);

      const slugExists = await this.prisma.meal.findFirst({
        where: { slug, id: { not: mealId } },
      });

      if (slugExists) {
        // Delete new image if meal update fails
        if (imageFile) {
          await this.s3Upload.deleteImage(imageUrl || "");
        }
        throw new BadRequestException(
          `Meal with title "${dto.title}" already exists`,
        );
      }
    }

    // 5. Update searchText if needed
    let searchText = existingMeal.searchText;
    if (dto.title || dto.shortDescription || ingredientData) {
      const title = dto.title || existingMeal.title;
      const description =
        dto.shortDescription || existingMeal.shortDescription || '';
      const ingredients =
        ingredientData?.ingredientNames || existingMeal.ingredientNames;
      searchText = `${title} ${description} ${ingredients.join(' ')}`;
    }

    try {
      // 6. Update meal
      const updatedMeal = await this.prisma.meal.update({
        where: { id: mealId },
        data: {
          title: dto.title,
          slug,
          shortDescription: dto.shortDescription,
          instructions: dto.instructions,
          imageUrl, // New or existing URL
          cookingTimeMinutes: dto.cookingTimeMinutes,
          difficulty: dto.difficulty,
          mealCategoryId: dto.mealCategoryId,
          regionId: dto.regionId,
          ...(ingredientData && ingredientData),
          ...(dietaryFlags && dietaryFlags),
          ...(dto.diabetesFriendly !== undefined && {
            diabetesFriendly: dto.diabetesFriendly,
          }),
          searchText,
        },
        include: {
          mealCategory: true,
          region: true,
        },
      });

      // 7. Delete old image if new one was uploaded
      if (imageFile && oldImageUrl && oldImageUrl !== imageUrl) {
        await this.s3Upload.deleteImage(oldImageUrl);
      }

      // 8. Clear caches
      await this.redis.del(`meal:${mealId}`);
      await this.clearMealCaches();

      // 9. Get ingredient details
      const ingredients = await this.getMealIngredients(mealId);

      return {
        ...updatedMeal,
        ingredients,
      };
    } catch (error) {
      // If update fails and new image was uploaded, delete it
      if (imageFile && imageUrl && imageUrl !== oldImageUrl) {
        await this.s3Upload.deleteImage(imageUrl);
      }
      throw error;
    }
  }

  // Delete meal and its image
  async deleteMeal(mealId: string, chefId: string) {
    const meal = await this.prisma.meal.findUnique({ where: { id: mealId } });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    // Delete from S3
    if (meal.imageUrl) {
      await this.s3Upload.deleteImage(meal.imageUrl);
    }

    // Delete ingredient details from Redis
    await this.redis.del(`meal:ingredients:${mealId}`);

    // Delete meal
    await this.prisma.meal.delete({ where: { id: mealId } });

    // Clear caches
    await this.redis.del(`meal:${mealId}`);
    await this.clearMealCaches();

    return { message: 'Meal deleted successfully' };
  }

  // Helper methods (same as before)
  private async processIngredients(
    ingredientInputs: IngredientInputDto[],
  ): Promise<{ ingredients: any[]; details: any[] }> {
    const ingredients: any[] = [];
    const details: any[] = [];

    for (const input of ingredientInputs) {
      let ingredient;

      if (this.isUUID(input.name)) {
        ingredient = await this.prisma.ingredient.findUnique({
          where: { id: input.name },
        });

        if (!ingredient) {
          throw new BadRequestException(
            `Ingredient with ID ${input.name} not found`,
          );
        }
      } else {
        const name = input.name.trim();

        ingredient = await this.prisma.ingredient.findFirst({
          where: {
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              { aliases: { has: name.toLowerCase() } },
            ],
          },
        });

        if (!ingredient) {
          ingredient = await this.prisma.ingredient.create({
            data: {
              name: this.capitalizeWords(name),
              slug: this.generateSlug(name),
              aliases: [name.toLowerCase()],
            },
          });
        }
      }

      ingredients.push(ingredient);
      details.push({
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
        quantity: input.quantity,
        isOptional: input.isOptional || false,
        isVeg: ingredient.isVeg,
        isVegan: ingredient.isVegan,
        isDairy: ingredient.isDairy,
        isNut: ingredient.isNut,
        isGluten: ingredient.isGluten,
      });
    }

    return { ingredients, details };
  }

  private calculateDietaryFlags(ingredients: any[]) {
    return {
      isVeg: ingredients.every((i) => i.isVeg),
      isVegan: ingredients.every((i) => i.isVegan),
      dairyFree: ingredients.every((i) => !i.isDairy),
      nutFree: ingredients.every((i) => !i.isNut),
      glutenFree: ingredients.every((i) => !i.isGluten),
    };
  }

  private async storeMealIngredients(mealId: string, details: any[]) {
    const cacheKey = `meal:ingredients:${mealId}`;
    await this.redis.set(cacheKey, JSON.stringify(details));
  }

  private async getMealIngredients(mealId: string) {
    const cacheKey = `meal:ingredients:${mealId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      select: { ingredientIds: true },
    });

    if (!meal) return [];

    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: meal.ingredientIds } },
    });

    return ingredients;
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private isUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private async clearMealCaches() {
    const keys = await this.redis.keys('meal-search:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getMealById(mealId: string) {
    const cacheKey = `meal:${mealId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const meal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        mealCategory: true,
        region: true,
      },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    const ingredients = await this.getMealIngredients(mealId);
    const result = { ...meal, ingredients };

    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  async incrementViewCount(mealId: string) {
    await this.prisma.meal.update({
      where: { id: mealId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementClickCount(mealId: string, userId: string) {
    await this.prisma.meal.update({
      where: { id: mealId },
      data: { clickCount: { increment: 1 } },
    });
  }

  async listMeals(page: number = 1, limit: number = 20, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.mealCategoryId) where.mealCategoryId = filters.mealCategoryId;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.isVeg !== undefined) where.isVeg = filters.isVeg;

    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        include: {
          mealCategory: true,
          region: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.meal.count({ where }),
    ]);

    return {
      meals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
