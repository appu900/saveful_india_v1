-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'CHEF');

-- CreateEnum
CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON');

-- CreateEnum
CREATE TYPE "IngredientType" AS ENUM ('VEGETABLE', 'FRUIT', 'GRAIN', 'PROTEIN', 'DAIRY', 'SPICE', 'OIL', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "stateCode" TEXT,
    "regionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenSet" (
    "userId" TEXT NOT NULL,
    "refreshHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenSet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "device" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDietProfile" (
    "userId" TEXT NOT NULL,
    "vegType" TEXT NOT NULL,
    "dairyFree" BOOLEAN NOT NULL DEFAULT false,
    "nutFree" BOOLEAN NOT NULL DEFAULT false,
    "glutenFree" BOOLEAN NOT NULL DEFAULT false,
    "hasDiabetes" BOOLEAN NOT NULL DEFAULT false,
    "otherAllergies" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDietProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CookedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "cookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "CookedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "description" TEXT,
    "nutritionInfo" TEXT,
    "type" "IngredientType" NOT NULL DEFAULT 'OTHER',
    "isVegetable" BOOLEAN NOT NULL DEFAULT false,
    "isFruit" BOOLEAN NOT NULL DEFAULT false,
    "availableSeasons" "Season"[] DEFAULT ARRAY['ALL_SEASON']::"Season"[],
    "categoryId" TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "isVegan" BOOLEAN NOT NULL DEFAULT true,
    "isDairy" BOOLEAN NOT NULL DEFAULT false,
    "isNut" BOOLEAN NOT NULL DEFAULT false,
    "isGluten" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "addedBy" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MealCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "instructions" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cookingTimeMinutes" INTEGER,
    "difficulty" "RecipeDifficulty" NOT NULL DEFAULT 'EASY',
    "regionId" TEXT,
    "mealCategoryId" TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "dairyFree" BOOLEAN NOT NULL DEFAULT true,
    "nutFree" BOOLEAN NOT NULL DEFAULT true,
    "glutenFree" BOOLEAN NOT NULL DEFAULT true,
    "diabetesFriendly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "instructions" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cookingTimeMinutes" INTEGER,
    "difficulty" "RecipeDifficulty" NOT NULL DEFAULT 'EASY',
    "regionId" TEXT,
    "mealCategoryId" TEXT,
    "ingredientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ingredientNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ingredientSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVeg" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "dairyFree" BOOLEAN NOT NULL DEFAULT true,
    "nutFree" BOOLEAN NOT NULL DEFAULT true,
    "glutenFree" BOOLEAN NOT NULL DEFAULT true,
    "diabetesFriendly" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "stateCode" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_lastActivity_idx" ON "UserSession"("lastActivity");

-- CreateIndex
CREATE INDEX "CookedMeal_userId_idx" ON "CookedMeal"("userId");

-- CreateIndex
CREATE INDEX "CookedMeal_mealId_idx" ON "CookedMeal"("mealId");

-- CreateIndex
CREATE INDEX "CookedMeal_cookedAt_idx" ON "CookedMeal"("cookedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CookedMeal_userId_mealId_cookedAt_key" ON "CookedMeal"("userId", "mealId", "cookedAt");

-- CreateIndex
CREATE INDEX "BookmarkedMeal_userId_idx" ON "BookmarkedMeal"("userId");

-- CreateIndex
CREATE INDEX "BookmarkedMeal_mealId_idx" ON "BookmarkedMeal"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkedMeal_userId_mealId_key" ON "BookmarkedMeal"("userId", "mealId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCategory_name_key" ON "IngredientCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "Ingredient_slug_idx" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Ingredient_categoryId_idx" ON "Ingredient"("categoryId");

-- CreateIndex
CREATE INDEX "Ingredient_type_idx" ON "Ingredient"("type");

-- CreateIndex
CREATE INDEX "Ingredient_isVegetable_isFruit_idx" ON "Ingredient"("isVegetable", "isFruit");

-- CreateIndex
CREATE INDEX "Ingredient_availableSeasons_idx" ON "Ingredient"("availableSeasons");

-- CreateIndex
CREATE INDEX "Ingredient_isVerified_idx" ON "Ingredient"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "MealCategory_name_key" ON "MealCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

-- CreateIndex
CREATE INDEX "Recipe_mealCategoryId_idx" ON "Recipe"("mealCategoryId");

-- CreateIndex
CREATE INDEX "Recipe_regionId_idx" ON "Recipe"("regionId");

-- CreateIndex
CREATE INDEX "Recipe_isVeg_isVegan_dairyFree_nutFree_glutenFree_diabetesF_idx" ON "Recipe"("isVeg", "isVegan", "dairyFree", "nutFree", "glutenFree", "diabetesFriendly");

-- CreateIndex
CREATE INDEX "Recipe_slug_idx" ON "Recipe"("slug");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Meal_slug_key" ON "Meal"("slug");

-- CreateIndex
CREATE INDEX "Meal_mealCategoryId_idx" ON "Meal"("mealCategoryId");

-- CreateIndex
CREATE INDEX "Meal_regionId_idx" ON "Meal"("regionId");

-- CreateIndex
CREATE INDEX "Meal_isVeg_isVegan_dairyFree_nutFree_glutenFree_diabetesFri_idx" ON "Meal"("isVeg", "isVegan", "dairyFree", "nutFree", "glutenFree", "diabetesFriendly");

-- CreateIndex
CREATE INDEX "Meal_slug_idx" ON "Meal"("slug");

-- CreateIndex
CREATE INDEX "Meal_clickCount_idx" ON "Meal"("clickCount");

-- CreateIndex
CREATE INDEX "Meal_createdAt_idx" ON "Meal"("createdAt");

-- CreateIndex
CREATE INDEX "Region_parentId_idx" ON "Region"("parentId");

-- CreateIndex
CREATE INDEX "Region_countryCode_idx" ON "Region"("countryCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenSet" ADD CONSTRAINT "TokenSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDietProfile" ADD CONSTRAINT "UserDietProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookedMeal" ADD CONSTRAINT "CookedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookedMeal" ADD CONSTRAINT "CookedMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkedMeal" ADD CONSTRAINT "BookmarkedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkedMeal" ADD CONSTRAINT "BookmarkedMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IngredientCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_mealCategoryId_fkey" FOREIGN KEY ("mealCategoryId") REFERENCES "MealCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_mealCategoryId_fkey" FOREIGN KEY ("mealCategoryId") REFERENCES "MealCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
