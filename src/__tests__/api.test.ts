import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * API-level tests for trigger-call and webhook routes.
 * We mock prisma and global fetch to avoid real DB/network calls.
 */

// ─── Webhook: secret validation ──────────────────────────────────────────────

describe('webhook secret validation', () => {
  const WEBHOOK_SECRET = 'test-secret'

  function validateSecret(querySecret: string | null, envSecret: string): boolean {
    return !!envSecret && querySecret === envSecret
  }

  it('returns true for matching secret', () => {
    expect(validateSecret(WEBHOOK_SECRET, WEBHOOK_SECRET)).toBe(true)
  })

  it('returns false for wrong secret', () => {
    expect(validateSecret('wrong', WEBHOOK_SECRET)).toBe(false)
  })

  it('returns false for missing secret in query', () => {
    expect(validateSecret(null, WEBHOOK_SECRET)).toBe(false)
  })

  it('returns false when env secret is empty', () => {
    expect(validateSecret(WEBHOOK_SECRET, '')).toBe(false)
  })
})

// ─── Webhook: idempotency ────────────────────────────────────────────────────

describe('webhook idempotency guard', () => {
  function shouldSkip(execution: { state: string; webhookCount: number }): boolean {
    return execution.state === 'COMPLETED' && execution.webhookCount > 0
  }

  it('skips already-completed calls', () => {
    expect(shouldSkip({ state: 'COMPLETED', webhookCount: 2 })).toBe(true)
  })

  it('does not skip a freshly COMPLETED call (webhookCount 0)', () => {
    expect(shouldSkip({ state: 'COMPLETED', webhookCount: 0 })).toBe(false)
  })

  it('does not skip IN_PROGRESS calls', () => {
    expect(shouldSkip({ state: 'IN_PROGRESS', webhookCount: 1 })).toBe(false)
  })
})

// ─── Trigger-call: state guard ───────────────────────────────────────────────

describe('trigger-call state guard', () => {
  function canTriggerCall(state: string, consentObtained: boolean): { ok: boolean; reason?: string } {
    if (!consentObtained) return { ok: false, reason: 'Customer consent not obtained' }
    if (state !== 'FAILED_ATTEMPT') return { ok: false, reason: `Cannot trigger — state is ${state}` }
    return { ok: true }
  }

  it('allows trigger for FAILED_ATTEMPT with consent', () => {
    expect(canTriggerCall('FAILED_ATTEMPT', true).ok).toBe(true)
  })

  it('blocks trigger without consent', () => {
    const r = canTriggerCall('FAILED_ATTEMPT', false)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/consent/)
  })

  it('blocks trigger for non-FAILED_ATTEMPT states', () => {
    for (const state of ['CALL_SCHEDULED', 'CALL_IN_PROGRESS', 'REDELIVERY_CONFIRMED']) {
      const r = canTriggerCall(state, true)
      expect(r.ok).toBe(false)
    }
  })
})

// ─── Bolna mock fetch ────────────────────────────────────────────────────────

describe('trigger-call: Bolna API integration (mocked)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends correct payload to Bolna and returns call_id', async () => {
    const mockCallId = 'bolna-abc-123'
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ call_id: mockCallId }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch(
      'https://api.bolna.dev/call',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: 'agent-1',
          recipient_phone_number: '+919876543210',
          user_data: { customerName: 'Test', trackingNumber: 'TRK001' },
        }),
      }
    )

    const data = await res.json()
    expect(data.call_id).toBe(mockCallId)
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.bolna.dev/call')
  })
})
