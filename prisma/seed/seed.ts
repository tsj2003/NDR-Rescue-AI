import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Upsert org
  let org = await prisma.organization.findFirst({ where: { name: 'Global Logistics Demo' } })
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Global Logistics Demo',
        operators: {
          create: {
            email: 'demo@logistics.com',
            name: 'Demo Operator',
            // bcrypt hash of 'demo1234' (cost 10)
            passwordHash: '$2b$10$EHZ.GhpPKU7UJsJM1X7T3eORD./V4KJQXP4JuLLIxbyvf.BtBlhzS',
          },
        },
      },
    })
    console.log('✅ Created organization:', org.name)
  } else {
    console.log('ℹ️  Organization already exists.')
  }

  // Always reset to clean demo state
  await prisma.auditEvent.deleteMany({ where: { shipment: { organizationId: org.id } } })
  await prisma.callExecution.deleteMany({ where: { shipment: { organizationId: org.id } } })
  await prisma.shipment.deleteMany({ where: { organizationId: org.id } })

  await prisma.shipment.createMany({
    data: [
      {
        trackingNumber: 'TRK10001',
        customerName: 'Priya Sharma',
        customerPhone: '+919876543210',
        dropAddress: '42, Koramangala 5th Block, Bengaluru, KA 560034',
        state: 'FAILED_ATTEMPT',
        failureReason: 'CUSTOMER_NOT_AVAILABLE',
        organizationId: org.id,
        consentObtained: true,
      },
      {
        trackingNumber: 'TRK10002',
        customerName: 'Rahul Mehta',
        customerPhone: '+919123456780',
        dropAddress: '15, Bandra West, Mumbai, MH 400050',
        state: 'FAILED_ATTEMPT',
        failureReason: 'ADDRESS_NOT_FOUND',
        organizationId: org.id,
        consentObtained: true,
      },
      {
        trackingNumber: 'TRK10003',
        customerName: 'Anjali Verma',
        customerPhone: '+919988776655',
        dropAddress: '7, Sector 18, Noida, UP 201301',
        state: 'FAILED_ATTEMPT',
        failureReason: 'GATE_LOCKED',
        organizationId: org.id,
        consentObtained: true,
      },
    ],
  })

  console.log('✅ Seeded 3 FAILED_ATTEMPT shipments (clean demo state).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

