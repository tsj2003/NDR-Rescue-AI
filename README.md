# NDR Rescue AI — Bolna Full Stack Engineering Assignment

Built by Tarandeep Singh Juneja for Bolna's Full Stack Engineer assignment.

NDR Rescue is a production-style operations console for failed last-mile deliveries. When a delivery attempt fails, the app triggers a Bolna voice agent to call the customer, collect a redelivery outcome, process Bolna's webhook, and update the logistics dashboard in real time.

## Use Case

Indian e-commerce and logistics teams spend heavily on Non-Delivery Report recovery: manual callbacks, repeated delivery attempts, and Return-to-Origin losses. The urgent workflow is phone-native because customers often need to confirm a time slot, correct an address, or cancel quickly before the parcel leaves the hub.

NDR Rescue converts a failed delivery into a resolved outcome within minutes:

1. Ops creates or selects a failed shipment.
2. Ops confirms explicit customer opt-in for an automated AI recovery call.
3. The backend triggers a Bolna outbound call with shipment context injected through `user_data`.
4. Bolna posts the call result to `/api/webhook/bolna`.
5. The webhook normalizes structured extraction, falls back to transcript parsing when needed, and updates the shipment.
6. The dashboard receives live Server-Sent Events and updates without refresh.

Primary metric: recover 45%+ of failed deliveries into confirmed redelivery slots within 10 minutes, while reducing manual recovery cost by 70%+.

## Why This Can Be a 1000 Cr Company

Back-of-the-envelope enterprise model:

- A top logistics/e-commerce network can see 1M+ failed deliveries per month.
- Charge about $2 per saved shipment.
- One client at 1M recovered/month can support roughly $24M ARR.
- Four to five major enterprise clients can cross $100M ARR, before upsells into collections, address verification, returns, and customer support calls.

## What Is Implemented

- Next.js App Router, TypeScript, Prisma, PostgreSQL, Recharts, Sonner, Playwright, and Vitest.
- Bolna call trigger endpoint: `POST /api/trigger-call`.
- Bolna webhook endpoint: `POST /api/webhook/bolna?secret=...`.
- Idempotent webhook processing keyed by Bolna call/execution ID.
- Explicit opt-in checkbox with `consentTime` stored in the DB.
- No-answer fallback ladder:
  - mark the call as `NO_ANSWER`,
  - generate a real self-serve `/recovery/:token` SMS/WhatsApp link,
  - send that link through Twilio SMS/WhatsApp when provider env vars are configured,
  - schedule a configurable retry,
  - move to manual review after max attempts.
- SSE endpoint: `GET /api/call-events?shipmentId=...` for live detail-page updates.
- Retry worker endpoint: `POST /api/recovery/retry-due`.
- Customer recovery page for slot confirmation, address update, pickup, or cancellation.
- Dashboard KPI and 7-day recovery trend chart.
- Dev simulator for completed calls and no-answer fallback demos.

## Architecture

```text
Ops Dashboard
  -> POST /api/trigger-call
  -> Bolna outbound call
  -> POST /api/webhook/bolna
  -> Prisma/PostgreSQL state machine
  -> SSE stream to shipment detail page
  -> dashboard metrics + recovery trend

No answer path:
  Bolna no_answer webhook
  -> CallExecution.NO_ANSWER
  -> Shipment.CALL_SCHEDULED + fallbackStatus.RETRY_SCHEDULED
  -> /recovery/:token link generated
  -> optional Twilio SMS/WhatsApp follow-up sent
  -> /api/recovery/retry-due triggers retry when due
  -> manual review after MAX_CALL_ATTEMPTS
```

## Quick Start

```bash
npm install
cp .env.example .env
npm run demo:setup
npm run dev
```

Open `http://localhost:3000/login`.

Demo login:

```text
demo@logistics.com / demo1234
```

Manual setup:

```bash
docker compose up -d
npx prisma migrate deploy
npm run seed
npm run dev
```

## Bolna Setup

Create/update the Bolna agent:

```bash
npm run setup-bolna
```

For local webhooks, expose the app:

```bash
npx ngrok http 3000
```

Then set:

```env
APP_URL="https://your-ngrok-domain.ngrok-free.app"
WEBHOOK_SECRET="a-long-random-secret"
BOLNA_API_KEY="..."
BOLNA_AGENT_ID="..."
```

Use this webhook URL in Bolna:

```text
https://your-ngrok-domain.ngrok-free.app/api/webhook/bolna?secret=WEBHOOK_SECRET
```

## Optional SMS/WhatsApp Provider

The app integrates with Twilio for demo SMS and WhatsApp follow-ups. Twilio trial accounts can be used for demos, but trial SMS recipients must be verified and WhatsApp requires joining the Twilio Sandbox first.

Add these env vars:

```env
FOLLOWUP_CHANNELS="sms,whatsapp"
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_SMS_FROM="+12345678900"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

If these are absent, NDR Rescue still generates the self-serve recovery link and logs the provider attempt as skipped.

## Key Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Demo operator login |
| `GET` | `/api/shipments` | Shipment queue |
| `POST` | `/api/shipments/create` | Create failed shipment with opt-in |
| `POST` | `/api/trigger-call` | Trigger Bolna outbound call |
| `POST` | `/api/webhook/bolna` | Receive Bolna call completion/no-answer |
| `GET` | `/api/call-events` | SSE stream for live shipment updates |
| `GET` | `/api/call-status` | Pollable call status fallback |
| `PATCH` | `/api/recovery/:token` | Customer self-serve recovery link |
| `POST` | `/api/recovery/retry-due` | Cron/worker endpoint for due retries |
| `POST` | `/api/dev/simulate-bolna-webhook` | Local completed/no-answer simulator |

## CI/CD (GitHub Actions → Netlify)

Workflow: `.github/workflows/ci-cd.yml`

1. **Lint & unit tests** on every push/PR to `main`
2. **Deploy to Netlify production** after CI passes on `main` pushes (and via manual `workflow_dispatch`)

Live app: [https://ndrrescue.netlify.app](https://ndrrescue.netlify.app)

### Required GitHub secrets

Create these under **Settings → Secrets and variables → Actions**:

| Secret | How to get it |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | [Netlify → User settings → Applications → Personal access tokens](https://app.netlify.com/user/applications#personal-access-tokens) |
| `NETLIFY_SITE_ID` | Site configuration → Site details → Site ID (for `ndrrescue`) |

Also keep production env vars in the Netlify site settings (`DATABASE_URL`, `APP_URL`, `JWT_SECRET`, `WEBHOOK_SECRET`, Bolna keys, etc.).

Build config lives in `netlify.toml` (Next.js plugin + Prisma generate).


## Verification

```bash
npx prisma generate
npm run lint
npm run test
npm run build
```

For E2E:

```bash
npm run dev
npm run test:e2e
```


## Submission Checklist

- Record the demo with `docs/demo-script.md`.
- Include the GitHub repo link.
- Include the deployed app link.
- Include one real Bolna call recording if available; otherwise use the simulator and clearly label it.
- Show the no-answer fallback path, because it answers the strongest operational objection.
