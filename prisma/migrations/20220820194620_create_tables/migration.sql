-- CreateEnum
CREATE TYPE "SitemapDeletionCycle" AS ENUM ('NOT_DELETED', 'MARKED_FOR_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "SitemapFileLifeCycle" AS ENUM ('UPLOADED', 'LINKED_TO_INDEX', 'MARKED_FOR_INDEX_LASTMOD_UPDATE');

-- CreateEnum
CREATE TYPE "SitemapFileEntityType" AS ENUM ('TEXT', 'VIDEO');

-- CreateEnum
CREATE TYPE "SitemapIndexFileLifeCycle" AS ENUM ('UPLOADED', 'LINKED_TO_ROBOTS_DOT_TXT');

-- CreateTable
CREATE TABLE "TextSitemapModulusCounter" (
    "id" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextSitemapModulusCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextSitemap" (
    "id" BIGINT NOT NULL,
    "link" TEXT NOT NULL,
    "modulusHashBase" INTEGER NOT NULL,
    "modulusHashValue" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL,
    "fileName" TEXT,
    "isIgnored" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "sitemapDeletionCycle" "SitemapDeletionCycle" NOT NULL DEFAULT 'NOT_DELETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextSitemap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSitemapModulusCounter" (
    "id" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSitemapModulusCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSitemap" (
    "id" INTEGER NOT NULL,
    "link" TEXT NOT NULL,
    "videoURL" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "startTimestamp" TIMESTAMP(3) NOT NULL,
    "endTimestamp" TIMESTAMP(3) NOT NULL,
    "actualDurationInSeconds" INTEGER NOT NULL,
    "modulusHashBase" INTEGER NOT NULL,
    "modulusHashValue" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL,
    "fileName" TEXT,
    "isIgnored" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isMarkedForUpdate" BOOLEAN NOT NULL DEFAULT false,
    "sitemapDeletionCycle" "SitemapDeletionCycle" NOT NULL DEFAULT 'NOT_DELETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSitemap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitemapFile" (
    "fileName" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "lifeCycle" "SitemapFileLifeCycle" NOT NULL DEFAULT 'UPLOADED',
    "location" TEXT NOT NULL,
    "entityType" "SitemapFileEntityType" NOT NULL,
    "indexFileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitemapFile_pkey" PRIMARY KEY ("fileName")
);

-- CreateTable
CREATE TABLE "SitemapIndexFile" (
    "fileName" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "lifeCycle" "SitemapIndexFileLifeCycle" NOT NULL DEFAULT 'UPLOADED',
    "location" TEXT NOT NULL,
    "entityType" "SitemapFileEntityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitemapIndexFile_pkey" PRIMARY KEY ("fileName")
);

-- CreateTable
CREATE TABLE "JobLock" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobLock_key_key" ON "JobLock"("key");

-- AddForeignKey
ALTER TABLE "TextSitemap" ADD CONSTRAINT "TextSitemap_fileName_fkey" FOREIGN KEY ("fileName") REFERENCES "SitemapFile"("fileName") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSitemap" ADD CONSTRAINT "VideoSitemap_fileName_fkey" FOREIGN KEY ("fileName") REFERENCES "SitemapFile"("fileName") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitemapFile" ADD CONSTRAINT "SitemapFile_indexFileName_fkey" FOREIGN KEY ("indexFileName") REFERENCES "SitemapIndexFile"("fileName") ON DELETE RESTRICT ON UPDATE CASCADE;
