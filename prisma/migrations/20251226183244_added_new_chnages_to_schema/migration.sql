/*
  Warnings:

  - You are about to drop the column `content` on the `Hacks` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Hacks` table. All the data in the column will be lost.
  - You are about to drop the column `youtubeVideoUrl` on the `Hacks` table. All the data in the column will be lost.
  - Added the required column `description` to the `Hacks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Hacks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Hacks" DROP COLUMN "content",
DROP COLUMN "imageUrl",
DROP COLUMN "youtubeVideoUrl",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
