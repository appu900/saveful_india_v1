-- AlterTable
ALTER TABLE "UserOnboarding" ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dietaryRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[];
