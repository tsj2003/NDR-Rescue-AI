# NDR Rescue Demo Script

Target length: 5-7 minutes.

## Before Recording

```bash
cp .env.example .env
npm run demo:setup
npm run dev
```

Open `http://localhost:3000/login`.

Demo login: `demo@logistics.com` / `demo1234`.

## 0:00-0:35 — Problem and Business Case

Say:

> "This is NDR Rescue, a Bolna-powered failed-delivery recovery console. Failed deliveries are expensive because operations teams manually call customers, arrange redelivery, and prevent return-to-origin. The speed angle matters: if we call within minutes, we can recover the parcel before it leaves the hub."

Point to:

- Total NDRs and recovery KPI.
- 7-day recovery chart.

Say:

> "At scale, a top logistics client with 1M failed deliveries per month and a $2 charge per saved shipment can support roughly $24M ARR. Four or five enterprise clients creates a 1000 Cr scale business."

## 0:35-1:25 — Consent and Shipment Creation

Click:

1. Sidebar: **Shipments**
2. **Add Shipment**
3. Fill:
   - Customer: `Meera Kapoor`
   - Phone: your test number or `9876543210`
   - Address: `221 Indiranagar 12th Main, Bengaluru`
   - Failure reason: `CUSTOMER_NOT_AVAILABLE`
4. Check the consent box:
   - "I confirm the customer has opted in to receive an automated AI voice call..."
5. Click **Add Shipment**

Say:

> "I do not trigger outbound automated calls unless explicit opt-in is stored. The database stores `consentObtained` and `consentTime`, and the trigger endpoint rejects calls without consent."

## 1:25-2:10 — Trigger Bolna Call

Click:

1. **Trigger Call** on the new shipment.
2. Open the shipment detail page.

Say:

> "The backend calls Bolna's outbound call API with the agent ID, customer phone number, and `user_data` fields: customer name, tracking number, address, and failure reason. In production this places a real phone call; locally I can use the simulator while preserving the same webhook path."

Point to:

- `Live SSE` badge.
- Call timeline with attempt number.
- Consent timestamp.

## 2:10-3:10 — Successful Call Path

Click:

1. **Complete** in the Call Timeline.

Say:

> "This simulates Bolna posting a completed call webhook. The webhook validates the secret, finds the call by unique call ID, normalizes Bolna's extraction fields, and updates the shipment."

Point to:

- Shipment state changes to `REDELIVERY_CONFIRMED`.
- Transcript panel appears.
- Extracted data panel appears.

Say:

> "Extraction reliability matters. Bolna may return `redelivery_slot`, `preferred_slot`, `delivery_slot`, or other variants. I normalize those into one internal shape. If structured extraction is missing, the webhook parses the transcript for slot phrases like 'tomorrow afternoon between 2 and 6 PM'. If no actionable slot exists, the shipment goes to manual review instead of pretending it recovered."

## 3:10-4:30 — Missed-Call Fallback

Go back to **Shipments**, trigger another failed shipment, and open its detail page.

Click:

1. **No answer** in the Call Timeline.

Say:

> "This answers the operational question: what if the customer does not pick up? The webhook marks the call as `NO_ANSWER`, generates a real self-serve recovery link, sends it through Twilio SMS or WhatsApp when provider credentials are configured, schedules the next voice retry, and updates the UI over Server-Sent Events without a page refresh."

Point to:

- `No-Answer Fallback Ladder`
- `RETRY_SCHEDULED`
- next retry time
- self-serve recovery link

Say:

> "The retry ladder is configurable with `NO_ANSWER_RETRY_MINUTES` and `MAX_CALL_ATTEMPTS`. The provider attempt is logged in the audit trail as sent, skipped, or failed. After the final attempt, the shipment moves to `MANUAL_REVIEW` with the recovery link still open."

## 4:30-5:20 — Customer Self-Serve Link

Click or copy the recovery link and open it in a new tab.

Click:

1. Choose `Tomorrow 12PM-5PM`.
2. Click **Confirm Slot**.

Say:

> "This is the fallback if voice fails. The customer can recover the shipment without an agent by confirming a slot, correcting the address, choosing pickup, or cancelling. The same shipment record updates in the operations dashboard."

Return to the shipment detail page and point out:

- State is recovered.
- Fallback status is complete.
- Expected slot is stored.

## 5:20-6:10 — Dashboard and Architecture

Click:

1. Sidebar: **Overview**

Say:

> "The dashboard now shows recovered shipments and trend data. The system is intentionally simple to deploy: Next.js API routes, Prisma/PostgreSQL, Bolna for voice, webhook idempotency by call ID, and SSE for live updates."

Mention:

- `POST /api/trigger-call`
- `POST /api/webhook/bolna`
- `GET /api/call-events`
- `POST /api/recovery/retry-due`

## 6:10-6:45 — Closing

Say:

> "This is not just a voice demo; it is a real enterprise workflow. It handles consent, call outcomes, extraction reliability, no-answer fallback, operator review, customer self-serve recovery, and live operational visibility."

End on the dashboard.
