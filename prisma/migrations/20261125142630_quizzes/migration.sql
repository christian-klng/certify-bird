-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "quizCorrect" INTEGER,
ADD COLUMN     "quizTotal" INTEGER;

-- AlterTable
ALTER TABLE "Issuance" ADD COLUMN     "quiz" JSONB,
ADD COLUMN     "quizId" TEXT;

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issuanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastCorrect" INTEGER,
    "lastTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quiz_organizationId_idx" ON "Quiz"("organizationId");

-- CreateIndex
CREATE INDEX "QuizCandidate_organizationId_email_idx" ON "QuizCandidate"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "QuizCandidate_issuanceId_email_key" ON "QuizCandidate"("issuanceId", "email");

-- AddForeignKey
ALTER TABLE "Issuance" ADD CONSTRAINT "Issuance_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizCandidate" ADD CONSTRAINT "QuizCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizCandidate" ADD CONSTRAINT "QuizCandidate_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "Issuance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
