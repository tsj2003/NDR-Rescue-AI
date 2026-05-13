-- CreateEnum
CREATE TYPE "ShipmentState" AS ENUM ('PENDING', 'FAILED_ATTEMPT', 'CALL_SCHEDULED', 'CALL_IN_PROGRESS', 'REDELIVERY_CONFIRMED', 'MANUAL_REVIEW', 'CANCELED');

-- CreateEnum
CREATE TYPE "CallState" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER');

-- CreateEnum
CREATE TYPE "FailureReason" AS ENUM ('CUSTOMER_NOT_AVAILABLE', 'ADDRESS_NOT_FOUND', 'WRONG_ADDRESS', 'GATE_LOCKED', 'REFUSED_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "FinalOutcome" AS ENUM ('REDELIVERY_SLOT_BOOKED', 'ADDRESS_CORRECTED', 'WILL_PICKUP', 'CANCELED_BY_CUSTOMER', 'ESCALATED_TO_HUMAN', 'UNREACHABLE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "state" "ShipmentState" NOT NULL DEFAULT 'FAILED_ATTEMPT',
    "failureReason" "FailureReason" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "consentTime" TIMESTAMP(3),
    "expectedSlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallExecution" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "state" "CallState" NOT NULL DEFAULT 'QUEUED',
    "transcript" TEXT,
    "recordingUrl" TEXT,
    "extractedData" JSONB,
    "finalOutcome" "FinalOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "webhookCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CallExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CallExecution_id_key" ON "CallExecution"("id");

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallExecution" ADD CONSTRAINT "CallExecution_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
