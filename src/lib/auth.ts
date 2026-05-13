import { cookies } from 'next/headers'

// Simple JWT-less auth with a signed cookie value.
// In production replace with a proper JWT library.
const JWT_SECRET = process.env.JWT_SECRET || 'secret-for-jwt-signing'

export function signToken(payload: Record<string, unknown>): string {
  const data = JSON.stringify(payload)
  // Base64url encode — good enough for demo; swap for jose/jsonwebtoken in prod
  const b64 = Buffer.from(data).toString('base64url')
  const sig = Buffer.from(`${b64}.${JWT_SECRET}`).toString('base64url').slice(0, 32)
  return `${b64}.${sig}`
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [b64, sig] = token.split('.')
    const expected = Buffer.from(`${b64}.${JWT_SECRET}`).toString('base64url').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(b64, 'base64url').toString())
  } catch {
    return null
  }
}

export async function getSession(): Promise<Record<string, unknown> | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireSession() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * Normalise a phone number to E.164 format.
 * Accepts Indian (+91) numbers primarily.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length > 10 && !digits.startsWith('91')) return `+${digits}`
  return `+${digits}`
}
