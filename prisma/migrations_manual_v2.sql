-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "lifeAlertPercent" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "maxLifeMinutes" INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LoanItem" ADD COLUMN     "currentHolderId" TEXT,
ADD COLUMN     "toolUnitId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "targetRole" TEXT;

-- CreateTable
CREATE TABLE "ToolUnit" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "supplierCode" TEXT,
    "maxLifeMinutes" INTEGER NOT NULL DEFAULT 1200,
    "usedLifeMinutes" INTEGER NOT NULL DEFAULT 0,
    "remainingLifeMinutes" INTEGER NOT NULL DEFAULT 1200,
    "resharpenCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'TERSEDIA',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolUsageLog" (
    "id" TEXT NOT NULL,
    "toolUnitId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loanTransactionId" TEXT,
    "handoverId" TEXT,
    "usedMinutes" INTEGER NOT NULL,
    "remainingAfter" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "adminId" TEXT,
    "purpose" TEXT,
    "expectedReturnDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_ADMIN',
    "rejectionReason" TEXT,
    "loanTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRequestItem" (
    "id" TEXT NOT NULL,
    "loanRequestId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "toolId" TEXT,
    "inventoryId" TEXT,
    "requestedQty" INTEGER NOT NULL DEFAULT 1,
    "assignedUnitIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "handoverNumber" TEXT NOT NULL,
    "loanTransactionId" TEXT NOT NULL,
    "loanItemId" TEXT NOT NULL,
    "toolUnitId" TEXT,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "usedMinutes" INTEGER NOT NULL DEFAULT 0,
    "proofImageData" TEXT,
    "conditionNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolUnit_unitCode_key" ON "ToolUnit"("unitCode");

-- CreateIndex
CREATE INDEX "ToolUnit_toolId_status_idx" ON "ToolUnit"("toolId", "status");

-- CreateIndex
CREATE INDEX "ToolUsageLog_toolUnitId_idx" ON "ToolUsageLog"("toolUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRequest_requestNumber_key" ON "LoanRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "LoanRequest_employeeId_status_idx" ON "LoanRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LoanRequest_status_idx" ON "LoanRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftHandover_handoverNumber_key" ON "ShiftHandover"("handoverNumber");

-- CreateIndex
CREATE INDEX "ShiftHandover_toEmployeeId_status_idx" ON "ShiftHandover"("toEmployeeId", "status");

-- CreateIndex
CREATE INDEX "ShiftHandover_fromEmployeeId_status_idx" ON "ShiftHandover"("fromEmployeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "LoanItem_currentHolderId_status_idx" ON "LoanItem"("currentHolderId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUnit" ADD CONSTRAINT "ToolUnit_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUsageLog" ADD CONSTRAINT "ToolUsageLog_toolUnitId_fkey" FOREIGN KEY ("toolUnitId") REFERENCES "ToolUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUsageLog" ADD CONSTRAINT "ToolUsageLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequest" ADD CONSTRAINT "LoanRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequestItem" ADD CONSTRAINT "LoanRequestItem_loanRequestId_fkey" FOREIGN KEY ("loanRequestId") REFERENCES "LoanRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequestItem" ADD CONSTRAINT "LoanRequestItem_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRequestItem" ADD CONSTRAINT "LoanRequestItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanItem" ADD CONSTRAINT "LoanItem_toolUnitId_fkey" FOREIGN KEY ("toolUnitId") REFERENCES "ToolUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanItem" ADD CONSTRAINT "LoanItem_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_loanTransactionId_fkey" FOREIGN KEY ("loanTransactionId") REFERENCES "LoanTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_loanItemId_fkey" FOREIGN KEY ("loanItemId") REFERENCES "LoanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_toolUnitId_fkey" FOREIGN KEY ("toolUnitId") REFERENCES "ToolUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

