-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "amountDueCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "providerStatus" TEXT NOT NULL,
    "financeStatus" TEXT NOT NULL DEFAULT 'open',
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "nextStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "actor" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "invoiceExternalId" TEXT,
    "customerId" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_externalId_key" ON "Invoice"("externalId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_financeStatus_idx" ON "Invoice"("financeStatus");

-- CreateIndex
CREATE INDEX "Invoice_customerId_financeStatus_idx" ON "Invoice"("customerId", "financeStatus");

-- CreateIndex
CREATE INDEX "AuditEntry_invoiceId_idx" ON "AuditEntry"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalToken_tokenHash_key" ON "PortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalToken_customerId_idx" ON "PortalToken"("customerId");

-- CreateIndex
CREATE INDEX "PortalToken_tokenHash_idx" ON "PortalToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEvent_eventId_key" ON "CollectionEvent"("eventId");

-- CreateIndex
CREATE INDEX "CollectionEvent_customerId_idx" ON "CollectionEvent"("customerId");

-- CreateIndex
CREATE INDEX "CollectionEvent_invoiceExternalId_idx" ON "CollectionEvent"("invoiceExternalId");

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
