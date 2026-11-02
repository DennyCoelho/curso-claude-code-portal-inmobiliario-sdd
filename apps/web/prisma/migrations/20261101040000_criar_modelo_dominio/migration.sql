BEGIN;

-- Criar esquema
CREATE SCHEMA IF NOT EXISTS "public";

-- Criar enumeração
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- Criar enumeração
CREATE TYPE "PropertyOperation" AS ENUM ('SALE', 'RENT');

-- Criar enumeração
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER');

-- Criar tabela
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "operation" "PropertyOperation" NOT NULL,
    "type" "PropertyType" NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "usableArea" DECIMAL(12,2),
    "totalArea" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parkingSpaces" INTEGER,
    "age" INTEGER,
    "address" TEXT NOT NULL,
    "addressNumber" TEXT NOT NULL,
    "addressComplement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "postalCode" VARCHAR(8) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'BR',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "PropertyImage" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(14) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- Criar tabela
CREATE TABLE "_FeatureToProperty" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_FeatureToProperty_AB_pkey" PRIMARY KEY ("A","B")
);

-- Criar índice
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Criar índice
CREATE INDEX "Property_isPublished_createdAt_idx" ON "Property"("isPublished", "createdAt" DESC);

-- Criar índice
CREATE INDEX "Property_isPublished_operation_type_idx" ON "Property"("isPublished", "operation", "type");

-- Criar índice
CREATE INDEX "Property_state_city_neighborhood_idx" ON "Property"("state", "city", "neighborhood");

-- Criar índice
CREATE INDEX "Property_isPublished_price_idx" ON "Property"("isPublished", "price");

-- Criar índice
CREATE UNIQUE INDEX "PropertyImage_publicId_key" ON "PropertyImage"("publicId");

-- Criar índice
CREATE INDEX "PropertyImage_propertyId_position_idx" ON "PropertyImage"("propertyId", "position");

-- Criar índice
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");

-- Criar índice
CREATE INDEX "Favorite_propertyId_idx" ON "Favorite"("propertyId");

-- Criar índice
CREATE UNIQUE INDEX "Favorite_userId_propertyId_key" ON "Favorite"("userId", "propertyId");

-- Criar índice
CREATE INDEX "Inquiry_userId_createdAt_idx" ON "Inquiry"("userId", "createdAt" DESC);

-- Criar índice
CREATE INDEX "Inquiry_propertyId_createdAt_idx" ON "Inquiry"("propertyId", "createdAt" DESC);

-- Criar índice
CREATE INDEX "_FeatureToProperty_B_index" ON "_FeatureToProperty"("B");

-- Criar chave estrangeira
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "_FeatureToProperty" ADD CONSTRAINT "_FeatureToProperty_A_fkey" FOREIGN KEY ("A") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar chave estrangeira
ALTER TABLE "_FeatureToProperty" ADD CONSTRAINT "_FeatureToProperty_B_fkey" FOREIGN KEY ("B") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras de domínio complementares ao esquema Prisma.
ALTER TABLE "Property"
    ADD CONSTRAINT "Property_price_positive" CHECK ("price" > 0),
    ADD CONSTRAINT "Property_areas_positive" CHECK (
        ("usableArea" IS NULL OR "usableArea" > 0) AND
        ("totalArea" IS NULL OR "totalArea" > 0)
    ),
    ADD CONSTRAINT "Property_counts_nonnegative" CHECK (
        ("bedrooms" IS NULL OR "bedrooms" >= 0) AND
        ("bathrooms" IS NULL OR "bathrooms" >= 0) AND
        ("parkingSpaces" IS NULL OR "parkingSpaces" >= 0) AND
        ("age" IS NULL OR "age" >= 0)
    ),
    ADD CONSTRAINT "Property_state_brazilian" CHECK ("state" IN (
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
        'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
        'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    )),
    ADD CONSTRAINT "Property_postalCode_digits" CHECK ("postalCode" ~ '^[0-9]{8}$'),
    ADD CONSTRAINT "Property_country_brazil" CHECK ("country" = 'BR');

ALTER TABLE "PropertyImage"
    ADD CONSTRAINT "PropertyImage_position_nonnegative" CHECK ("position" >= 0);

-- Várias imagens secundárias são permitidas; apenas uma pode ser a principal.
CREATE UNIQUE INDEX "PropertyImage_one_main_per_property"
    ON "PropertyImage" ("propertyId") WHERE "isMain" = true;

-- O serviço de contato deverá normalizar e validar DDD e número antes de persistir.
ALTER TABLE "Inquiry"
    ADD CONSTRAINT "Inquiry_phone_international" CHECK ("phone" ~ '^\+55[1-9][0-9]{9,10}$');

COMMIT;

