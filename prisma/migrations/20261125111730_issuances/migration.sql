-- CreateTable
CREATE TABLE "Issuance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT,
    "courseTitle" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuedOn" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "design" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issuance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issuanceId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issuance_organizationId_idx" ON "Issuance"("organizationId");

-- CreateIndex
CREATE INDEX "Certificate_organizationId_recipientEmail_idx" ON "Certificate"("organizationId", "recipientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_issuanceId_recipientEmail_key" ON "Certificate"("issuanceId", "recipientEmail");

-- AddForeignKey
ALTER TABLE "Issuance" ADD CONSTRAINT "Issuance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issuance" ADD CONSTRAINT "Issuance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "Issuance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
