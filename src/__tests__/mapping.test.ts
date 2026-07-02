import { describe, expect, it } from 'vitest'
import {
  buildNoAnswerFallback,
  deriveOutcome,
  mapCallState,
  normalizeBolnaExtraction,
} from '../lib/recovery'

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
    ['voicemail', 'NO_ANSWER'],
    ['unknown_value', 'IN_PROGRESS'],
    ['', 'IN_PROGRESS'],
  ])('maps %s to %s', (input, expected) => {
    expect(mapCallState(input)).toBe(expected)
  })
})

describe('Bolna extraction normalization and outcome', () => {
  it('accepts varied slot field names', () => {
    const extraction = normalizeBolnaExtraction({ preferred_delivery_slot: 'Tomorrow 2PM' })
    const outcome = deriveOutcome(extraction, 'COMPLETED', null)
    expect(outcome.finalOutcome).toBe('REDELIVERY_SLOT_BOOKED')
    expect(outcome.newShipmentState).toBe('REDELIVERY_CONFIRMED')
    expect(outcome.expectedSlot).toBe('Tomorrow 2PM')
  })

  it('falls back to transcript slot parsing when structured extraction is missing', () => {
    const extraction = normalizeBolnaExtraction(null)
    const outcome = deriveOutcome(extraction, 'COMPLETED', 'Customer: Tomorrow afternoon between 2 and 6 PM works.')
    expect(outcome.finalOutcome).toBe('REDELIVERY_SLOT_BOOKED')
    expect(outcome.expectedSlot).toBe('Afternoon 2PM-6PM')
  })

  it('marks completed calls with missing actionable fields for manual review', () => {
    const extraction = normalizeBolnaExtraction({})
    const outcome = deriveOutcome(extraction, 'COMPLETED', 'Customer: I am not sure.')
    expect(outcome.finalOutcome).toBe('ESCALATED_TO_HUMAN')
    expect(outcome.newShipmentState).toBe('MANUAL_REVIEW')
  })

  it('marks no-answer as unreachable without falsely resolving the shipment', () => {
    const extraction = normalizeBolnaExtraction({ unreachable: true })
    const outcome = deriveOutcome(extraction, 'NO_ANSWER', null)
    expect(outcome.finalOutcome).toBe('UNREACHABLE')
    expect(outcome.newShipmentState).toBeNull()
  })
})

describe('no-answer fallback ladder', () => {
  it('schedules a retry and self-serve link before max attempts', () => {
    const result = buildNoAnswerFallback({
      execution: { attemptNumber: 1 },
      shipment: { retryCount: 0, recoveryToken: 'tok_123' },
      appUrl: 'https://demo.example.com',
      maxAttempts: 2,
      retryDelayMinutes: 15,
      now: new Date('2026-07-02T08:00:00.000Z'),
    })

    expect(result.fallbackStatus).toBe('RETRY_SCHEDULED')
    expect(result.smsFollowupLink).toBe('https://demo.example.com/recovery/tok_123')
    expect(result.nextRetryAt?.toISOString()).toBe('2026-07-02T08:15:00.000Z')
  })

  it('moves to manual review at the final attempt', () => {
    const result = buildNoAnswerFallback({
      execution: { attemptNumber: 2 },
      shipment: { retryCount: 1, recoveryToken: 'tok_123' },
      appUrl: 'https://demo.example.com',
      maxAttempts: 2,
      retryDelayMinutes: 15,
      now: new Date('2026-07-02T08:00:00.000Z'),
    })

    expect(result.fallbackStatus).toBe('MANUAL_REVIEW')
    expect(result.nextRetryAt).toBeNull()
    expect(result.manualReviewReason).toMatch(/No answer after 2/)
  })
})

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
