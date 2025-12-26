/*
  Warnings:

  - You are about to drop the column `cookingInstructions` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `hacksAndTips` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `longDescription` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `prepLongDescription` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `prepShortDescription` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `alternatives` on the `RecipeIngredient` table. All the data in the column will be lost.
  - You are about to drop the column `categoryName` on the `RecipeIngredient` table. All the data in the column will be lost.
  - You are about to drop the column `instruction` on the `RecipeIngredient` table. All the data in the column will be lost.
  - You are about to drop the column `isRecommended` on the `RecipeIngredient` table. All the data in the column will be lost.
  - You are about to drop the column `recipeId` on the `RecipeIngredient` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `RecipeIngredient` table. All the data in the column will be lost.
  - Added the required column `aboutThisDish` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proTip` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Made the column `avgRating` on table `Recipe` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `categoryId` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.
  - Made the column `quantity` on table `RecipeIngredient` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_recipeId_fkey";

-- DropIndex
DROP INDEX "RecipeIngredient_categoryName_idx";

-- DropIndex
DROP INDEX "RecipeIngredient_recipeId_sortOrder_idx";

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "cookingInstructions",
DROP COLUMN "hacksAndTips",
DROP COLUMN "longDescription",
DROP COLUMN "prepLongDescription",
DROP COLUMN "prepShortDescription",
DROP COLUMN "shortDescription",
DROP COLUMN "title",
ADD COLUMN     "aboutThisDish" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "proTip" TEXT NOT NULL,
ADD COLUMN     "savingTechnique" TEXT,
ALTER COLUMN "avgRating" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecipeIngredient" DROP COLUMN "alternatives",
DROP COLUMN "categoryName",
DROP COLUMN "instruction",
DROP COLUMN "isRecommended",
DROP COLUMN "recipeId",
DROP COLUMN "unit",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "RecipeIngredientCategory" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeIngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookingStep" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeIngredientCategory_recipeId_sortOrder_idx" ON "RecipeIngredientCategory"("recipeId", "sortOrder");

-- CreateIndex
CREATE INDEX "CookingStep_recipeId_stepNumber_idx" ON "CookingStep"("recipeId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CookingStep_recipeId_stepNumber_key" ON "CookingStep"("recipeId", "stepNumber");

-- CreateIndex
CREATE INDEX "Recipe_name_idx" ON "Recipe"("name");

-- CreateIndex
CREATE INDEX "RecipeIngredient_categoryId_sortOrder_idx" ON "RecipeIngredient"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "RecipeIngredientCategory" ADD CONSTRAINT "RecipeIngredientCategory_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RecipeIngredientCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookingStep" ADD CONSTRAINT "CookingStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
