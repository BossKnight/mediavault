-- CreateTable
CREATE TABLE "Copy" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "format" TEXT,
    "edition" TEXT,
    "seasons" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "completeSeries" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Copy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Copy_progressId_idx" ON "Copy"("progressId");

-- AddForeignKey
ALTER TABLE "Copy" ADD CONSTRAINT "Copy_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "UserMediaProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

