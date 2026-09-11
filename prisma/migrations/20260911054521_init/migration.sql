-- CreateTable
CREATE TABLE "DatabaseConnectionTest" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseConnectionTest_pkey" PRIMARY KEY ("id")
);
