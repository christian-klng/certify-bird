-- CreateTable
CREATE TABLE "SigningKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publicJwk" JSONB NOT NULL,
    "privateJwk" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SigningKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SigningKey_organizationId_key" ON "SigningKey"("organizationId");

-- AddForeignKey
ALTER TABLE "SigningKey" ADD CONSTRAINT "SigningKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
