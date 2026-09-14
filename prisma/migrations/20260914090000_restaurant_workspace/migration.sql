BEGIN;

CREATE TYPE "ServiceMode" AS ENUM ('QUICK_SERVICE', 'TABLE_SERVICE');
CREATE TYPE "DefaultOrderType" AS ENUM ('DINE_IN', 'TAKEOUT');

CREATE TABLE "RestaurantSettings" (
    "restaurantId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "serviceMode" "ServiceMode" NOT NULL DEFAULT 'QUICK_SERVICE',
    "defaultOrderType" "DefaultOrderType" NOT NULL DEFAULT 'TAKEOUT',
    "orderNumberPrefix" TEXT NOT NULL DEFAULT 'ORD',
    "receiptHeader" TEXT NOT NULL DEFAULT '',
    "receiptFooter" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestaurantSettings_pkey" PRIMARY KEY ("restaurantId"),
    CONSTRAINT "RestaurantSettings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RestaurantSettings_currencyCode_format" CHECK ("currencyCode" ~ '^[A-Z]{3}$')
);

CREATE INDEX "RestaurantMembership_restaurantId_status_createdAt_id_idx" ON "RestaurantMembership"("restaurantId", "status", "createdAt", "id");

COMMIT;
