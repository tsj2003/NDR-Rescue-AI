import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  BOLNA_API_KEY: z.string().optional(),
  BOLNA_AGENT_ID: z.string().optional(),
  BOLNA_FROM_PHONE_NUMBER: z.string().optional(),
  WEBHOOK_SECRET: z.string().min(8).default('my-super-secret-webhook-key'),
  JWT_SECRET: z.string().min(8).default('secret-for-jwt-signing'),
  CRON_SECRET: z.string().min(8).optional(),
  NO_ANSWER_RETRY_MINUTES: z.coerce.number().int().positive().default(15),
  MAX_CALL_ATTEMPTS: z.coerce.number().int().min(1).max(4).default(2),
  FOLLOWUP_CHANNELS: z.string().default('sms,whatsapp'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
})

export type ServerEnv = z.infer<typeof envSchema>

let cachedEnv: ServerEnv | null = null

export function getServerEnv() {
  if (cachedEnv) return cachedEnv
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }
  cachedEnv = parsed.data
  return cachedEnv
}
