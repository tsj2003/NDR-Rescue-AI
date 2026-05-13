import { describe, it, expect } from 'vitest'
import { normalizePhone, signToken, verifyToken } from '../lib/auth'

// ─── Phone normalisation ────────────────────────────────────────────────────

describe('normalizePhone', () => {
  it('prefixes a 10-digit Indian number with +91', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210')
  })

  it('handles 91-prefixed 12-digit numbers', () => {
    expect(normalizePhone('919876543210')).toBe('+919876543210')
  })

  it('passes through E.164 numbers unchanged in digit form', () => {
    expect(normalizePhone('+12345678900')).toBe('+12345678900')
  })

  it('strips non-digit characters before processing', () => {
    expect(normalizePhone('(987) 654-3210')).toBe('+919876543210')
  })

  it('handles numbers with dashes and spaces', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210')
  })
})

// ─── Auth token ─────────────────────────────────────────────────────────────

describe('signToken / verifyToken', () => {
  it('round-trips a payload', () => {
    const payload = { userId: 'u1', email: 'test@example.com' }
    const token = signToken(payload)
    expect(typeof token).toBe('string')
    const decoded = verifyToken(token)
    expect(decoded).toMatchObject(payload)
  })

  it('returns null for a tampered token', () => {
    const token = signToken({ userId: 'u1' })
    const tampered = token.slice(0, -4) + 'XXXX'
    expect(verifyToken(tampered)).toBeNull()
  })

  it('returns null for a garbage string', () => {
    expect(verifyToken('not.a.valid.token.at.all')).toBeNull()
  })
})
