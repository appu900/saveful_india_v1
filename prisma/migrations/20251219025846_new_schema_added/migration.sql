/*
  Warnings:

  - You are about to drop the column `isFruit` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `isVegetable` on the `Ingredient` table. All the data in the column will be lost.
  - The `nutritionInfo` column on the `Ingredient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `cookingTimeMinutes` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `mealCategoryId` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the `BookmarkedMeal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CookedMeal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Meal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MealCategory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `IngredientCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cookingInstructions` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longDescription` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Made the column `shortDescription` on table `Recipe` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RecipeType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'BEVERAGE', 'APPETIZER', 'MAIN_COURSE', 'SIDE_DISH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IngredientType" ADD VALUE 'CONDIMENT';
ALTER TYPE "IngredientType" ADD VALUE 'HERB';
ALTER TYPE "IngredientType" ADD VALUE 'NUT';
ALTER TYPE "IngredientType" ADD VALUE 'SEED';

-- DropForeignKey
ALTER TABLE "BookmarkedMeal" DROP CONSTRAINT "BookmarkedMeal_mealId_fkey";

-- DropForeignKey
ALTER TABLE "BookmarkedMeal" DROP CONSTRAINT "BookmarkedMeal_userId_fkey";

-- DropForeignKey
ALTER TABLE "CookedMeal" DROP CONSTRAINT "CookedMeal_mealId_fkey";

-- DropForeignKey
ALTER TABLE "CookedMeal" DROP CONSTRAINT "CookedMeal_userId_fkey";

-- DropForeignKey
ALTER TABLE "Meal" DROP CONSTRAINT "Meal_mealCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Meal" DROP CONSTRAINT "Meal_regionId_fkey";

-- DropForeignKey
ALTER TABLE "Recipe" DROP CONSTRAINT "Recipe_mealCategoryId_fkey";

-- DropIndex
DROP INDEX "Ingredient_availableSeasons_idx";

-- DropIndex
DROP INDEX "Ingredient_isVegetable_isFruit_idx";

-- DropIndex
DROP INDEX "Recipe_isVeg_isVegan_dairyFree_nutFree_glutenFree_diabetesF_idx";

-- DropIndex
DROP INDEX "Recipe_mealCategoryId_idx";

-- DropIndex
DROP INDEX "RecipeIngredient_recipeId_idx";

-- AlterTable
ALTER TABLE "Ingredient" DROP COLUMN "isFruit",
DROP COLUMN "isVegetable",
DROP COLUMN "nutritionInfo",
ADD COLUMN     "nutritionInfo" JSONB;

-- AlterTable
ALTER TABLE "IngredientCategory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "cookingTimeMinutes",
DROP COLUMN "instructions",
DROP COLUMN "mealCategoryId",
ADD COLUMN     "avgRating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cookCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cookingInstructions" TEXT NOT NULL,
ADD COLUMN     "hacksAndTips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ingredientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ingredientNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ingredientSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "longDescription" TEXT NOT NULL,
ADD COLUMN     "portions" TEXT,
ADD COLUMN     "prepAndCookTime" TEXT,
ADD COLUMN     "prepLongDescription" TEXT,
ADD COLUMN     "prepShortDescription" TEXT,
ADD COLUMN     "recipeType" "RecipeType" NOT NULL DEFAULT 'MAIN_COURSE',
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "youtubeUrl" TEXT,
ALTER COLUMN "shortDescription" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN     "alternatives" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "instruction" TEXT,
ADD COLUMN     "isRecommended" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "BookmarkedMeal";

-- DropTable
DROP TABLE "CookedMeal";

-- DropTable
DROP TABLE "Meal";

-- DropTable
DROP TABLE "MealCategory";

-- CreateTable
CREATE TABLE "CookedRecipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "cookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "notes" TEXT,

    CONSTRAINT "CookedRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkedRecipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkedRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CookedRecipe_userId_idx" ON "CookedRecipe"("userId");

-- CreateIndex
CREATE INDEX "CookedRecipe_recipeId_idx" ON "CookedRecipe"("recipeId");

-- CreateIndex
CREATE INDEX "CookedRecipe_cookedAt_idx" ON "CookedRecipe"("cookedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CookedRecipe_userId_recipeId_cookedAt_key" ON "CookedRecipe"("userId", "recipeId", "cookedAt");

-- CreateIndex
CREATE INDEX "BookmarkedRecipe_userId_idx" ON "BookmarkedRecipe"("userId");

-- CreateIndex
CREATE INDEX "BookmarkedRecipe_recipeId_idx" ON "BookmarkedRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkedRecipe_userId_recipeId_key" ON "BookmarkedRecipe"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "IngredientCategory_sortOrder_idx" ON "IngredientCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "Recipe_recipeType_idx" ON "Recipe"("recipeType");

-- CreateIndex
CREATE INDEX "Recipe_difficulty_idx" ON "Recipe"("difficulty");

-- CreateIndex
CREATE INDEX "Recipe_isVeg_isVegan_dairyFree_nutFree_glutenFree_idx" ON "Recipe"("isVeg", "isVegan", "dairyFree", "nutFree", "glutenFree");

-- CreateIndex
CREATE INDEX "Recipe_cookCount_idx" ON "Recipe"("cookCount");

-- CreateIndex
CREATE INDEX "Recipe_avgRating_idx" ON "Recipe"("avgRating");

-- CreateIndex
CREATE INDEX "Recipe_createdAt_idx" ON "Recipe"("createdAt");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_sortOrder_idx" ON "RecipeIngredient"("recipeId", "sortOrder");

-- CreateIndex
CREATE INDEX "RecipeIngredient_categoryName_idx" ON "RecipeIngredient"("categoryName");

-- AddForeignKey
ALTER TABLE "CookedRecipe" ADD CONSTRAINT "CookedRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookedRecipe" ADD CONSTRAINT "CookedRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkedRecipe" ADD CONSTRAINT "BookmarkedRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkedRecipe" ADD CONSTRAINT "BookmarkedRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
