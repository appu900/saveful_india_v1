import { RedisService } from '../../../infra/cache/redis.service';
import { PrismaService } from '../../../infra/database/prisma.service';

interface SearchMealsDto {
  ingredients: string[];
  mealCategory?: string;
  userId: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  maxCookingTime?: number;
  page?: number;
  limit?: number;
}

export class MealSearchService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}
  async searchMeals(dto: SearchMealsDto) {
    const {
      ingredients,
      mealCategory,
      userId,
      difficulty,
      maxCookingTime,
      page = 1,
      limit = 20,
    } = dto;

    const cacheKey = this.getCacheKey(dto);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const userProfile = await this.getUserProfile(userId);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (ingredients.length > 0) {
      const ingredientsLower = ingredients.map((ing) => ing.toLowerCase());
      conditions.push(`"ingredientNames" && $${paramIndex}::text[]`);
      params.push(ingredientsLower);
      paramIndex++;
    }
    // Dietary prefrence
    if (userProfile) {
      if (userProfile.vegType === 'vegetarian') {
        conditions.push(`"isVeg" = true`);
      }
      if (userProfile.vegType === 'vegan') {
        conditions.push(`"isVegan" = true`);
      }
      if (userProfile.dairyFree) {
        conditions.push(`"dairyFree" = true`);
      }
      if (userProfile.nutFree) {
        conditions.push(`"nutFree" = true`);
      }
      if (userProfile.glutenFree) {
        conditions.push(`"glutenFree" = true`);
      }
      if (userProfile.hasDiabetes) {
        conditions.push(`"diabetesFriendly" = true`);
      }
    }

    if (difficulty) {
      conditions.push(`difficulty = $${paramIndex}`);
      params.push(difficulty);
      paramIndex++;
    }
    // Cooking time filter
    if (maxCookingTime) {
      conditions.push(`"cookingTimeMinutes" <= $${paramIndex}`);
      params.push(maxCookingTime);
      paramIndex++;
    }

    if (mealCategory) {
      const category = await this.prisma.mealCategory.findFirst({
        where: { name: { contains: mealCategory, mode: 'insensitive' } },
      });
      if (category) {
        conditions.push(`"mealCategoryId" = $${paramIndex}`);
        params.push(category.id);
        paramIndex++;
      }
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const ingredientsLower = ingredients.map((ing) => ing.toLowerCase());

    const meals = await this.prisma.$queryRawUnsafe(
      `
      SELECT 
        id,
        title,
        slug,
        "shortDescription",
        "imageUrl",
        "cookingTimeMinutes",
        difficulty,
        "ingredientNames",
        "isVeg",
        "isVegan",
        "dairyFree",
        "nutFree",
        "glutenFree",
        -- Calculate match score using array functions
        (
          SELECT COUNT(*)
          FROM unnest("ingredientNames") AS ing
          WHERE ing = ANY($${params.length + 1}::text[])
        ) as matched_count,
        array_length("ingredientNames", 1) as total_ingredients,
        -- Calculate match percentage
        ROUND(
          (
            SELECT COUNT(*)::numeric
            FROM unnest("ingredientNames") AS ing
            WHERE ing = ANY($${params.length + 1}::text[])
          ) / NULLIF(array_length("ingredientNames", 1), 0) * 100
        ) as match_percentage
      FROM "Meal"
      ${whereClause}
      ORDER BY matched_count DESC, match_percentage DESC
      LIMIT $${params.length + 2}
      OFFSET $${params.length + 3}
    `,
      ...params,
      ingredientsLower,
      limit,
      (page - 1) * limit,
    );

    // 5. Get total count for pagination
    const totalResult = (await this.prisma.$queryRawUnsafe(
      `
      SELECT COUNT(*) as count
      FROM "Meal"
      ${whereClause}
    `,
      ...params,
    )) as Array<{ count: string }>;

    const total = parseInt(totalResult[0]?.count || '0');

    const response = {
      results: meals,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
    await this.redis.setex(cacheKey, 300, JSON.stringify(response));
    return response;
  }

  private async getUserProfile(userId: string) {
    const cacheKey = `user:profile:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const profile = await this.prisma.userDietProfile.findUnique({
      where: { userId },
    });

    if (profile) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(profile));
    }

    return profile;
  }

  async searchMealsSimple(dto: SearchMealsDto) {
    const {
      ingredients,
      userId,
      mealCategory,
      difficulty,
      maxCookingTime,
      page = 1,
      limit = 20,
    } = dto;

    const userProfile = await this.getUserProfile(userId);

    // Build where clause
    const where: any = {};

    // Array contains check (very fast with GIN index!)
    if (ingredients.length > 0) {
      where.ingredientNames = {
        hasSome: ingredients.map((ing) => ing.toLowerCase()),
      };
    }

    // Dietary filters
    if (userProfile?.vegType === 'vegetarian') where.isVeg = true;
    if (userProfile?.vegType === 'vegan') where.isVegan = true;
    if (userProfile?.dairyFree) where.dairyFree = true;
    if (userProfile?.nutFree) where.nutFree = true;
    if (userProfile?.glutenFree) where.glutenFree = true;
    if (userProfile?.hasDiabetes) where.diabetesFriendly = true;

    if (difficulty) where.difficulty = difficulty;
    if (maxCookingTime) where.cookingTimeMinutes = { lte: maxCookingTime };

    if (mealCategory) {
      const category = await this.prisma.mealCategory.findFirst({
        where: { name: { contains: mealCategory, mode: 'insensitive' } },
      });
      if (category) where.mealCategoryId = category.id;
    }

    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          shortDescription: true,
          imageUrl: true,
          cookingTimeMinutes: true,
          difficulty: true,
          ingredientNames: true,
          isVeg: true,
          isVegan: true,
          dairyFree: true,
          nutFree: true,
          glutenFree: true,
        },
        orderBy: { clickCount: 'desc' }, // Popular first
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.meal.count({ where }),
    ]);

    // Calculate match scores in-memory (fast since we have all data)
    const mealsWithScores = meals.map((meal) => {
      const matchedCount = meal.ingredientNames.filter((ing) =>
        ingredients.some((searchIng) =>
          ing.toLowerCase().includes(searchIng.toLowerCase()),
        ),
      ).length;

      return {
        ...meal,
        matchedCount,
        totalIngredients: meal.ingredientNames.length,
        matchPercentage: Math.round((matchedCount / ingredients.length) * 100),
      };
    });

    // Sort by match percentage
    mealsWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return {
      results: mealsWithScores,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async getMealById(mealId: string, userId: string) {
    const cacheKey = `meal:${mealId}`;
    const cached = await this.redis.get(cacheKey);

    let meal;
    if (cached) {
      meal = JSON.parse(cached);
    } else {
      meal = await this.prisma.meal.findUnique({
        where: { id: mealId },
        include: {
          mealCategory: true,
          region: true,
        },
      });

      if (meal) {
        // Increment view count
        await this.prisma.meal.update({
          where: { id: mealId },
          data: { viewCount: { increment: 1 } },
        });

        await this.redis.setex(cacheKey, 3600, JSON.stringify(meal));
      }
    }

    // Check dietary compatibility
    const userProfile = await this.getUserProfile(userId);
    const compatibility = this.checkCompatibility(meal, userProfile);

    // Get ingredient details from the embedded IDs
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: meal.ingredientIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        isVeg: true,
        isVegan: true,
        isDairy: true,
        isNut: true,
        isGluten: true,
      },
    });

    return {
      ...meal,
      ingredients,
      isCompatibleWithUserDiet: compatibility.isCompatible,
      incompatibleReasons: compatibility.reasons,
    };
  }


   async findSimilarMeals(mealId: string, limit: number = 10) {
    const cacheKey = `similar-meals:${mealId}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const sourceMeal = await this.prisma.meal.findUnique({
      where: { id: mealId },
      select: { ingredientIds: true },
    });

    if (!sourceMeal) throw new Error('Meal not found');

    // Array overlap query - finds meals with common ingredients
    const similarMeals = await this.prisma.$queryRaw`
      SELECT 
        id,
        title,
        "shortDescription",
        "imageUrl",
        "cookingTimeMinutes",
        difficulty,
        "ingredientNames",
        -- Count matching ingredients
        (
          SELECT COUNT(*)
          FROM unnest("ingredientIds") AS ing_id
          WHERE ing_id = ANY(${sourceMeal.ingredientIds}::text[])
        ) as matching_count,
        array_length("ingredientIds", 1) as total_ingredients,
        -- Jaccard similarity
        ROUND(
          (
            SELECT COUNT(*)::numeric
            FROM unnest("ingredientIds") AS ing_id
            WHERE ing_id = ANY(${sourceMeal.ingredientIds}::text[])
          ) / (
            array_length("ingredientIds", 1) + ${sourceMeal.ingredientIds.length} -
            (
              SELECT COUNT(*)
              FROM unnest("ingredientIds") AS ing_id
              WHERE ing_id = ANY(${sourceMeal.ingredientIds}::text[])
            )
          ) * 100
        ) as similarity_percentage
      FROM "Meal"
      WHERE 
        id != ${mealId}
        AND "ingredientIds" && ${sourceMeal.ingredientIds}::text[]
      ORDER BY matching_count DESC, similarity_percentage DESC
      LIMIT ${limit}
    `;

    await this.redis.setex(cacheKey, 3600, JSON.stringify(similarMeals));
    return similarMeals;
  }

  // Autocomplete - still uses Ingredient table
  async autocompleteIngredients(query: string, limit: number = 10) {
    const cacheKey = `autocomplete:${query}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { aliases: { has: query.toLowerCase() } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: limit,
    });

    await this.redis.setex(cacheKey, 1800, JSON.stringify(ingredients));
    return ingredients;
  }

  // Trending meals (uses precomputed clickCount)
  async getTrendingMeals(limit: number = 10) {
    const cacheKey = `trending-meals:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trending = await this.prisma.meal.findMany({
      where: {
        clickCount: { gt: 0 }, // Has at least one click
      },
      select: {
        id: true,
        title: true,
        shortDescription: true,
        imageUrl: true,
        cookingTimeMinutes: true,
        difficulty: true,
        clickCount: true,
      },
      orderBy: [
        { clickCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    await this.redis.setex(cacheKey, 300, JSON.stringify(trending)); // 5min
    return trending;
  }


   private checkCompatibility(meal: any, profile: any) {
    if (!profile) return { isCompatible: true, reasons: [] };

    const reasons: string[] = [];
    if (profile.vegType === 'vegetarian' && !meal.isVeg) {
      reasons.push('Contains non-vegetarian ingredients');
    }
    if (profile.vegType === 'vegan' && !meal.isVegan) {
      reasons.push('Contains animal products');
    }
    if (profile.dairyFree && !meal.dairyFree) {
      reasons.push('Contains dairy');
    }
    if (profile.nutFree && !meal.nutFree) {
      reasons.push('Contains nuts');
    }
    if (profile.glutenFree && !meal.glutenFree) {
      reasons.push('Contains gluten');
    }
    if (profile.hasDiabetes && !meal.diabetesFriendly) {
      reasons.push('Not suitable for diabetes');
    }

    return { isCompatible: reasons.length === 0, reasons };
  }



  private getCacheKey(dto: SearchMealsDto): string {
    const {
      ingredients,
      mealCategory,
      userId,
      difficulty,
      maxCookingTime,
      page,
    } = dto;
    return `meal-search:${userId}:${ingredients.sort().join(',')}:${mealCategory || ''}:${difficulty || ''}:${maxCookingTime || ''}:${page}`;
  }
}
