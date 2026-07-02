import prisma from '../src/lib/prisma'
import { subDays } from 'date-fns'
import { createRecoveryToken } from '../src/lib/recovery'

async function main() {
  console.log('🌱 Seeding historical NDR data...')

  // Clear current data if you want, or just add to it.
  // We'll just add 40 historical shipments spread across the last 7 days.

  const states = ['REDELIVERY_CONFIRMED', 'FAILED_ATTEMPT', 'CANCELED', 'REDELIVERY_CONFIRMED'] as const
  const reasons = ['ADDRESS_NOT_FOUND', 'CUSTOMER_NOT_AVAILABLE', 'GATE_LOCKED', 'REFUSED_DELIVERY'] as const
  const names = ['Rahul Mehta', 'Siddharth Jain', 'Ananya Singh', 'Vikram Malhotra', 'Sneha Reddy', 'Amit Shah', 'Priya Sharma']

  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(Math.random() * 7) // 0 to 6 days ago
    const date = subDays(new Date(), daysAgo)
    const state = states[Math.floor(Math.random() * states.length)]
    
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: `TRK-${Date.now()}-${i}`,
        customerName: names[Math.floor(Math.random() * names.length)],
        customerPhone: `+919090${Math.floor(100000 + Math.random() * 900000)}`,
        dropAddress: '123 Demo St, Mumbai, Maharashtra',
        failureReason: reasons[Math.floor(Math.random() * reasons.length)],
        state: state,
        consentObtained: state === 'REDELIVERY_CONFIRMED',
        consentTime: state === 'REDELIVERY_CONFIRMED' ? date : null,
        recoveryToken: createRecoveryToken(),
        expectedSlot: state === 'REDELIVERY_CONFIRMED' ? 'Tomorrow 10AM-1PM' : null,
        createdAt: date,
        updatedAt: date,
        organizationId: 'cmp3649ep0000wc3650lxwai5'
      }
    })

    if (state === 'REDELIVERY_CONFIRMED') {
      await prisma.callExecution.create({
        data: {
          id: `bolna_fake_${Math.random().toString(36).substring(7)}`,
          shipmentId: shipment.id,
          state: 'COMPLETED',
          finalOutcome: 'REDELIVERY_SLOT_BOOKED',
          transcript: 'Agent: Hello, I am calling about your package. \nCustomer: Yes, please deliver it tomorrow morning.',
          createdAt: date,
          updatedAt: date,
        }
      })
    }
  }

  console.log('✅ Seeded 40 historical shipments. Your graph will now be beautiful!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
