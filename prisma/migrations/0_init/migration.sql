CREATE TABLE "Shop" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "url" TEXT NOT NULL,
  "logoColor" TEXT NOT NULL DEFAULT '#F0F0F0',
  "textColor" TEXT NOT NULL DEFAULT '#333',
  "deliveryHrs" INTEGER NOT NULL DEFAULT 48,
  "shipCost" INTEGER NOT NULL DEFAULT 30,
  "freeFrom" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "Product" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "imageUrl" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Price" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "shopId" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "oldPrice" DOUBLE PRECISION,
  "discountPct" DOUBLE PRECISION,
  "inStock" BOOLEAN NOT NULL DEFAULT true,
  "productUrl" TEXT,
  "imageUrl" TEXT,
  "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Price_productId_shopId_key" UNIQUE ("productId", "shopId"),
  CONSTRAINT "Price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "Price_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Price_productId_idx" ON "Price"("productId");
