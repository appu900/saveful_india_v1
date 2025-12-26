-- CreateTable
CREATE TABLE "UserOnboarding" (
    "userId" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "noOfAdults" INTEGER NOT NULL DEFAULT 1,
    "noOfChildren" INTEGER NOT NULL DEFAULT 0,
    "tastePreference" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trackSurveyDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboarding_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserOnboarding" ADD CONSTRAINT "UserOnboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
