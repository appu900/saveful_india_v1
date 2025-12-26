-- CreateTable
CREATE TABLE "HackCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "HackCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hacks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "youtubeVideoUrl" TEXT,
    "content" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Hacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hacks" ADD CONSTRAINT "Hacks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HackCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
