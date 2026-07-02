import crypto from 'node:crypto'
import type { CallExecution, Shipment } from '@prisma/client'

export const FALLBACK_STATUS = {
  NONE: 'NONE',
  RETRY_SCHEDULED: 'RETRY_SCHEDULED',
  RETRY_CALL_QUEUED: 'RETRY_CALL_QUEUED',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  COMPLETE: 'COMPLETE',
} as const

export type FallbackStatus = (typeof FALLBACK_STATUS)[keyof typeof FALLBACK_STATUS]
export type CallStateValue = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER'
export type FinalOutcomeValue =
  | 'REDELIVERY_SLOT_BOOKED'
  | 'ADDRESS_CORRECTED'
  | 'WILL_PICKUP'
  | 'CANCELED_BY_CUSTOMER'
  | 'ESCALATED_TO_HUMAN'
  | 'UNREACHABLE'

export type NormalizedExtraction = {
  redeliverySlot: string | null
  addressUpdate: string | null
  willPickup: boolean
  canceled: boolean
  escalate: boolean
  unreachable: boolean
  consent: boolean | null
  raw: Record<string, unknown> | null
}

export function createRecoveryToken() {
  return crypto.randomBytes(18).toString('base64url')
}

export function mapCallState(status: string): CallStateValue {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
    case 'succeeded':
      return 'COMPLETED'
    case 'in_progress':
    case 'ringing':
    case 'initiated':
    case 'answered':
      return 'IN_PROGRESS'
    case 'failed':
    case 'error':
      return 'FAILED'
    case 'no_answer':
    case 'no-answer':
    case 'busy':
    case 'canceled':
    case 'cancelled':
    case 'not_answered':
    case 'voicemail':
      return 'NO_ANSWER'
    default:
      return 'IN_PROGRESS'
  }
}

function getFirstString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function getFirstBoolean(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', 'yes', 'y'].includes(normalized)) return true
      if (['false', 'no', 'n'].includes(normalized)) return false
    }
  }
  return false
}

export function normalizeBolnaExtraction(data: Record<string, unknown> | null): NormalizedExtraction {
  if (!data) {
    return {
      redeliverySlot: null,
      addressUpdate: null,
      willPickup: false,
      canceled: false,
      escalate: false,
      unreachable: false,
      consent: null,
      raw: null,
    }
  }

  return {
    redeliverySlot: getFirstString(data, [
      'redelivery_slot',
      'slot',
      'preferred_slot',
      'preferred_delivery_slot',
      'delivery_slot',
      'reschedule_time',
    ]),
    addressUpdate: getFirstString(data, ['correct_address', 'address_update', 'updated_address', 'new_address']),
    willPickup: getFirstBoolean(data, ['will_pickup', 'customer_will_pickup', 'pickup_from_hub']),
    canceled: getFirstBoolean(data, ['cancel', 'canceled', 'cancelled', 'cancel_order']),
    escalate: getFirstBoolean(data, ['escalate', 'manual_review', 'human_handoff']),
    unreachable: getFirstBoolean(data, ['unreachable', 'wrong_number']),
    consent: data.consent === undefined ? null : getFirstBoolean(data, ['consent', 'recording_consent']),
    raw: data,
  }
}

export function extractSlotFromTranscript(transcript: string | null): string | null {
  if (!transcript) return null
  const t = transcript.toLowerCase()

  const rangeMatch = t.match(/(?:between\s+)?(\d{1,2})(?:\s*(?:to|and|-)\s*)(\d{1,2})\s*(am|pm)?/)
  if (rangeMatch) {
    const h1 = rangeMatch[1]
    const h2 = rangeMatch[2]
    const period = rangeMatch[3] ?? (parseInt(h1, 10) < 7 ? 'pm' : '')
    const tod = t.includes('morning') ? 'Morning' : t.includes('afternoon') ? 'Afternoon' : t.includes('evening') ? 'Evening' : ''
    return `${tod ? tod + ' ' : ''}${h1}${period.toUpperCase()}-${h2}${period.toUpperCase()}`
  }

  if (t.includes('morning')) return 'Morning (9AM-12PM)'
  if (t.includes('afternoon')) return 'Afternoon (12PM-5PM)'
  if (t.includes('evening')) return 'Evening (5PM-9PM)'

  const timeMatch = t.match(/(?:at|around|by)\s*(\d{1,2})(?::\d{2})?\s*(am|pm)/i)
  if (timeMatch) return `${timeMatch[1]}${timeMatch[2].toUpperCase()}`

  return null
}

export function deriveOutcome(
  extraction: NormalizedExtraction,
  callState: CallStateValue,
  transcript: string | null
): {
  finalOutcome: FinalOutcomeValue | null
  newShipmentState: 'REDELIVERY_CONFIRMED' | 'MANUAL_REVIEW' | 'CANCELED' | null
  expectedSlot: string | null
} {
  if (callState === 'NO_ANSWER') {
    return { finalOutcome: 'UNREACHABLE', newShipmentState: null, expectedSlot: null }
  }

  if (extraction.redeliverySlot) {
    return {
      finalOutcome: 'REDELIVERY_SLOT_BOOKED',
      newShipmentState: 'REDELIVERY_CONFIRMED',
      expectedSlot: extraction.redeliverySlot,
    }
  }
  if (extraction.addressUpdate) {
    return { finalOutcome: 'ADDRESS_CORRECTED', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (extraction.willPickup) {
    return { finalOutcome: 'WILL_PICKUP', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (extraction.canceled) {
    return { finalOutcome: 'CANCELED_BY_CUSTOMER', newShipmentState: 'CANCELED', expectedSlot: null }
  }
  if (extraction.escalate || extraction.unreachable) {
    return { finalOutcome: 'ESCALATED_TO_HUMAN', newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
  }

  if (callState === 'COMPLETED' && transcript) {
    const tLower = transcript.toLowerCase()
    if (
      tLower.includes('cancel') ||
      tLower.includes('do not want it') ||
      tLower.includes("don't want it") ||
      tLower.includes('return it')
    ) {
      return { finalOutcome: 'CANCELED_BY_CUSTOMER', newShipmentState: 'CANCELED', expectedSlot: null }
    }

    const slotFromTranscript = extractSlotFromTranscript(transcript)
    if (slotFromTranscript) {
      return {
        finalOutcome: 'REDELIVERY_SLOT_BOOKED',
        newShipmentState: 'REDELIVERY_CONFIRMED',
        expectedSlot: slotFromTranscript,
      }
    }
  }

  if (callState === 'COMPLETED') {
    return { finalOutcome: 'ESCALATED_TO_HUMAN', newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
  }

  return { finalOutcome: null, newShipmentState: null, expectedSlot: null }
}

export function buildRecoveryLink(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, '')}/recovery/${token}`
}

export function buildNoAnswerFallback(params: {
  execution: Pick<CallExecution, 'attemptNumber'>
  shipment: Pick<Shipment, 'retryCount' | 'recoveryToken'>
  appUrl: string
  maxAttempts: number
  retryDelayMinutes: number
  now?: Date
}) {
  const now = params.now ?? new Date()
  const attemptNumber = params.execution.attemptNumber || 1
  const attemptsUsed = Math.max(params.shipment.retryCount, attemptNumber)
  const recoveryToken = params.shipment.recoveryToken ?? createRecoveryToken()
  const smsFollowupLink = buildRecoveryLink(params.appUrl, recoveryToken)

  if (attemptNumber < params.maxAttempts) {
    const nextRetryAt = new Date(now.getTime() + params.retryDelayMinutes * 60_000)
    return {
      recoveryToken,
      smsFollowupLink,
      retryCount: attemptsUsed,
      fallbackStatus: FALLBACK_STATUS.RETRY_SCHEDULED,
      nextRetryAt,
      manualReviewReason: null,
      auditEvent: 'FALLBACK_RETRY_SCHEDULED',
      auditDetails: {
        attemptNumber,
        maxAttempts: params.maxAttempts,
        nextRetryAt: nextRetryAt.toISOString(),
        smsFollowupLink,
        channels: ['sms_link', 'whatsapp_link', 'voice_retry'],
      },
    }
  }

  return {
    recoveryToken,
    smsFollowupLink,
    retryCount: attemptsUsed,
    fallbackStatus: FALLBACK_STATUS.MANUAL_REVIEW,
    nextRetryAt: null,
    manualReviewReason: `No answer after ${attemptNumber} automated voice attempt${attemptNumber === 1 ? '' : 's'}. SMS/WhatsApp recovery link remains open.`,
    auditEvent: 'FALLBACK_MANUAL_REVIEW',
    auditDetails: {
      attemptNumber,
      maxAttempts: params.maxAttempts,
      smsFollowupLink,
      channels: ['sms_link', 'whatsapp_link', 'manual_review'],
    },
  }
}
