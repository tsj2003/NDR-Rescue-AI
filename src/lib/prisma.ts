import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma 7 uses the "client" engine which requires a driver adapter.
 * We use @prisma/adapter-pg for a standard Postgres setup.
 *
 * The singleton pattern prevents creating a new connection pool on every
 * hot-module replacement during Next.js development.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

// In development, attach the client to `globalThis` so HMR doesn't create
// a new pool on every file save. In production, create one instance per
// worker process.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
