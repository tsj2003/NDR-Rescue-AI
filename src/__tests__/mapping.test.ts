import { describe, it, expect } from 'vitest'

// ─── Status mapping ──────────────────────────────────────────────────────────

function mapCallState(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed': case 'done': return 'COMPLETED'
    case 'in_progress': case 'ringing': case 'answered': return 'IN_PROGRESS'
    case 'failed': case 'error': return 'FAILED'
    case 'no_answer': case 'busy': case 'no-answer': return 'NO_ANSWER'
    default: return 'IN_PROGRESS'
  }
}

describe('mapCallState', () => {
  it.each([
    ['completed', 'COMPLETED'],
    ['done', 'COMPLETED'],
    ['in_progress', 'IN_PROGRESS'],
    ['ringing', 'IN_PROGRESS'],
    ['answered', 'IN_PROGRESS'],
    ['failed', 'FAILED'],
    ['error', 'FAILED'],
    ['no_answer', 'NO_ANSWER'],
    ['busy', 'NO_ANSWER'],
    ['no-answer', 'NO_ANSWER'],
    ['unknown_value', 'IN_PROGRESS'],
    ['', 'IN_PROGRESS'],
  ])('maps %s → %s', (input, expected) => {
    expect(mapCallState(input)).toBe(expected)
  })
})

// ─── Extraction normalisation ────────────────────────────────────────────────

function extractOutcome(data: Record<string, unknown> | null) {
  if (!data) return { finalOutcome: null, newShipmentState: null, expectedSlot: null }
  if (data.redelivery_slot || data.slot || data.preferred_slot) {
    return {
      finalOutcome: 'REDELIVERY_SLOT_BOOKED',
      newShipmentState: 'REDELIVERY_CONFIRMED',
      expectedSlot: String(data.redelivery_slot ?? data.slot ?? data.preferred_slot ?? ''),
    }
  }
  if (data.correct_address || data.address_update) {
    return { finalOutcome: 'ADDRESS_CORRECTED', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (data.will_pickup === true) {
    return { finalOutcome: 'WILL_PICKUP', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (data.cancel === true) {
    return { finalOutcome: 'CANCELED_BY_CUSTOMER', newShipmentState: 'CANCELED', expectedSlot: null }
  }
  if (data.escalate === true) {
    return { finalOutcome: 'ESCALATED_TO_HUMAN', newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
  }
  return { finalOutcome: null, newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
}

describe('extractOutcome', () => {
  it('returns REDELIVERY_SLOT_BOOKED for redelivery_slot', () => {
    const r = extractOutcome({ redelivery_slot: 'Tomorrow 2PM' })
    expect(r.finalOutcome).toBe('REDELIVERY_SLOT_BOOKED')
    expect(r.newShipmentState).toBe('REDELIVERY_CONFIRMED')
    expect(r.expectedSlot).toBe('Tomorrow 2PM')
  })

  it('accepts slot alias', () => {
    const r = extractOutcome({ slot: 'Friday morning' })
    expect(r.finalOutcome).toBe('REDELIVERY_SLOT_BOOKED')
  })

  it('returns ADDRESS_CORRECTED for address_update', () => {
    const r = extractOutcome({ address_update: '12 Main St' })
    expect(r.finalOutcome).toBe('ADDRESS_CORRECTED')
    expect(r.newShipmentState).toBe('REDELIVERY_CONFIRMED')
  })

  it('returns WILL_PICKUP', () => {
    const r = extractOutcome({ will_pickup: true })
    expect(r.finalOutcome).toBe('WILL_PICKUP')
  })

  it('returns CANCELED_BY_CUSTOMER', () => {
    const r = extractOutcome({ cancel: true })
    expect(r.finalOutcome).toBe('CANCELED_BY_CUSTOMER')
    expect(r.newShipmentState).toBe('CANCELED')
  })

  it('returns ESCALATED_TO_HUMAN', () => {
    const r = extractOutcome({ escalate: true })
    expect(r.finalOutcome).toBe('ESCALATED_TO_HUMAN')
    expect(r.newShipmentState).toBe('MANUAL_REVIEW')
  })

  it('returns MANUAL_REVIEW for empty extraction', () => {
    const r = extractOutcome({})
    expect(r.finalOutcome).toBeNull()
    expect(r.newShipmentState).toBe('MANUAL_REVIEW')
  })

  it('handles null gracefully', () => {
    const r = extractOutcome(null)
    expect(r.finalOutcome).toBeNull()
    expect(r.newShipmentState).toBeNull()
  })
})

// ─── Dashboard metric calculation ────────────────────────────────────────────

describe('dashboard metric: recoveryRate', () => {
  function calcRecoveryRate(total: number, recovered: number): string {
    return total > 0 ? ((recovered / total) * 100).toFixed(1) : '0.0'
  }

  it('returns 0.0 for no shipments', () => {
    expect(calcRecoveryRate(0, 0)).toBe('0.0')
  })

  it('calculates 100% recovery', () => {
    expect(calcRecoveryRate(5, 5)).toBe('100.0')
  })

  it('rounds to 1 decimal', () => {
    expect(calcRecoveryRate(3, 1)).toBe('33.3')
  })
})
