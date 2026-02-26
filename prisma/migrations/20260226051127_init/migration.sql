-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "fromEns" TEXT NOT NULL,
    "toEns" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_fromEns_toEns_key" ON "Relationship"("fromEns", "toEns");
