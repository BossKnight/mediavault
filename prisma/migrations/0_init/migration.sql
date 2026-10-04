-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV', 'GAME', 'BOOK');

-- CreateEnum
CREATE TYPE "MetadataSource" AS ENUM ('TMDB', 'RAWG', 'OPENLIBRARY');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('PLAN_TO_WATCH', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'DROPPED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('OWNED', 'WISHLIST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "source" "MetadataSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "coverUrl" TEXT,
    "overview" TEXT,
    "genres" TEXT[],
    "creator" TEXT,
    "isbn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMediaProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "status" "WatchStatus" NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "rating" INTEGER,
    "reviewNotes" TEXT,
    "ownedSeasons" INTEGER[],
    "completeSeries" BOOLEAN NOT NULL DEFAULT false,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platform" TEXT,
    "hoursPlayed" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownership" "OwnershipStatus" NOT NULL DEFAULT 'OWNED',

    CONSTRAINT "UserMediaProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MediaItem_mediaType_idx" ON "MediaItem"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_source_mediaType_externalId_key" ON "MediaItem"("source", "mediaType", "externalId");

-- CreateIndex
CREATE INDEX "UserMediaProgress_userId_status_idx" ON "UserMediaProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserMediaProgress_userId_ownership_idx" ON "UserMediaProgress"("userId", "ownership");

-- CreateIndex
CREATE UNIQUE INDEX "UserMediaProgress_userId_mediaItemId_key" ON "UserMediaProgress"("userId", "mediaItemId");

-- AddForeignKey
ALTER TABLE "UserMediaProgress" ADD CONSTRAINT "UserMediaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMediaProgress" ADD CONSTRAINT "UserMediaProgress_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

