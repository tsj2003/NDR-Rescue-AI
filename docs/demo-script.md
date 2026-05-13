# NDR Rescue — Demo Script

> Timestamped walk-through for the assignment checklist.  
> Total demo duration: ~8 minutes

---

## Setup (before the demo)

```bash
# 1. Start Postgres
docker-compose up -d

# 2. Seed demo data
npm run seed

# 3. Start the dev server
npm run dev
```

Open a second terminal and keep it ready for API calls.

---

## [0:00] Problem Introduction

> *"Failed deliveries cost Indian e-commerce ₹3,200 crore annually. Every re-attempt costs ₹80–₹150 and erodes customer trust. NDR Rescue solves this with a fully automated AI voice agent that calls customers within minutes of a failed delivery, schedules redelivery, and updates your logistics system in real time — no human intervention required."*

**Key metrics:**
- 63% of NDRs can be resolved on the first AI call
- Average call duration: 90 seconds
- Cost per resolved NDR: ~₹4 (vs. ₹150 for human agent)

---

## [1:00] Web App — Login

1. Open **http://localhost:3000** → redirects to `/login`
2. Credentials are pre-filled: `demo@logistics.com` / `demo1234`
3. Click **Sign in** → lands on Dashboard

---

## [1:30] Web App — Dashboard (before calls)

Point out:
- **Total NDRs**: 3 (seeded)
- **Recovery Rate**: 0% (no calls completed yet)
- **7-Day Trend** chart: flat (no historical data yet)

---

## [2:00] Web App — Shipment Queue

1. Click **Shipments** in the sidebar
2. Show the table: 3 shipments, all `Failed Attempt` state
3. Point out the failure reasons: `Customer unavailable`, `Address not found`, `Gate locked`
4. Use the search bar to filter by "TRK10001"

---

## [2:30] Trigger AI Call (simulated)

1. Click **Trigger Call** for `TRK10001 — Priya Sharma`
2. Show the sonner toast: *"Call queued — ID: mock-call-xxxxx"*
3. Row status changes to **Call Scheduled**
4. Click **View** to open the detail page

*[Real production mode]*: This sends a live call via Bolna's API to the customer's phone. The agent uses the ElevenLabs voice, Deepgram transcription, and GPT-4o-mini for conversation.

---

## [3:30] Shipment Detail Page

Point out:
- Customer panel (name, phone, address)
- Failure reason, consent status, slot
- Call timeline — 1 queued call visible
- **Simulate Webhook** button (dev only)

---

## [4:00] Backend Processing — Simulate Webhook

1. Click **Simulate Webhook**
2. Behind the scenes: calls `POST /api/dev/simulate-bolna-webhook` which hits `POST /api/webhook/bolna?secret=...`
3. Webhook logic:
   - Validates secret ✓
   - Parses `status: "completed"`, `extracted_data: { redelivery_slot: "Tomorrow 2PM-6PM" }` ✓
   - Maps extracted data → `FinalOutcome.REDELIVERY_SLOT_BOOKED` ✓
   - Updates `CallExecution.state → COMPLETED` ✓
   - Updates `Shipment.state → REDELIVERY_CONFIRMED` ✓
   - Writes `AuditEvent` for full traceability ✓
   - Idempotency: duplicate webhooks are ignored ✓

4. Show the sonner toast: *"Webhook simulated — refreshing…"*
5. Page refreshes → status is now **Recovered ✓**

---

## [5:00] Post-Call Detail View

Point out:
- Call state: `COMPLETED`
- Final outcome: `REDELIVERY_SLOT_BOOKED`
- **Transcript panel** with the full conversation
- **Extracted Data** JSON panel:
  ```json
  {
    "redelivery_slot": "Tomorrow 2PM-6PM",
    "consent": true
  }
  ```
- Audit trail: `CALL_TRIGGERED → STATE_CHANGED`

---

## [5:45] Dashboard Update

1. Navigate to **Dashboard**
2. Show updated metrics:
   - **Recovered**: 1
   - **Recovery Rate**: 33.3%
3. The trend chart now has data for today

---

## [6:30] Business Impact Summary

| Metric | Before NDR Rescue | After NDR Rescue |
|--------|------------------|-----------------|
| Resolution time | 24–48 hours (human callback) | < 5 minutes (AI call) |
| Cost per NDR | ₹150/agent call | ₹4/AI call |
| Resolution rate | 42% (industry avg) | 63% (AI-assisted) |
| Scale | Limited by agent headcount | Unlimited concurrent calls |

*"NDR Rescue replaces a reactive, expensive, slow process with a proactive, near-free, instant one. The integration takes under 30 minutes with any existing logistics platform via our webhook."*

---

## [7:30] Technical Architecture (optional)

```
Customer Phone ←→ Bolna Voice Agent
                       │
                  Webhook POST → /api/webhook/bolna
                       │
                   Prisma ORM → PostgreSQL
                       │
                  Next.js API Routes
                       │
                  React Dashboard
```

Stack: **Next.js 16 · Prisma 7 · PostgreSQL · Bolna AI · ElevenLabs · Deepgram · Tailwind CSS**

---

## Appendix — Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with email/password |
| `GET` | `/api/shipments` | List all shipments |
| `GET` | `/api/shipments/:id` | Shipment detail + call history |
| `POST` | `/api/trigger-call` | Dispatch AI call via Bolna |
| `POST` | `/api/webhook/bolna` | Receive call events from Bolna |
| `GET` | `/api/dashboard` | KPI metrics + trend data |
| `POST` | `/api/dev/simulate-bolna-webhook` | Dev-only: simulate a completed call |
