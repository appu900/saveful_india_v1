/*
  Warnings:

  - You are about to drop the column `addedBy` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `availableSeasons` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `isFruit` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `isVegetable` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `parentIngredientId` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `relatedHacks` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `sponsorPanels` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `stickerCategories` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Ingredient` table. All the data in the column will be lost.
  - Made the column `hasPage` on table `Ingredient` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Ingredient_type_idx";

-- AlterTable
ALTER TABLE "Ingredient" DROP COLUMN "addedBy",
DROP COLUMN "availableSeasons",
DROP COLUMN "isFruit",
DROP COLUMN "isVegetable",
DROP COLUMN "parentIngredientId",
DROP COLUMN "relatedHacks",
DROP COLUMN "sponsorPanels",
DROP COLUMN "stickerCategories",
DROP COLUMN "type",
ALTER COLUMN "hasPage" SET NOT NULL;

-- DropEnum
DROP TYPE "IngredientType";

-- DropEnum
DROP TYPE "Season";
