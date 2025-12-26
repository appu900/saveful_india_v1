-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "averageWeight" INTEGER,
ADD COLUMN     "inSeasonMonths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPantryItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentIngredientId" TEXT,
ADD COLUMN     "relatedHacks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sponsorPanels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "stickerCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "theme" TEXT;
