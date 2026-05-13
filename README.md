# NDR Rescue — AI Voice Agent for Delivery Recovery

> **Bolna AI FSE Assignment Submission** | Tarandeep Singh Juneja

A production-ready web platform that deploys an AI voice agent to automatically recover failed deliveries (NDR) by calling customers, capturing redelivery slots, and updating logistics ops in real-time.

---

## 🎯 The Problem

Indian e-commerce loses ₹4,500+ crore annually to failed deliveries (NDRs). The current fix: a human agent calls the customer manually — slow, expensive (₹45/call), and inconsistent. **NDR Rescue** replaces that call with an AI voice agent that costs ₹4/call and resolves in under 5 minutes.

## 🏗 Architecture

```
Customer → [Failed Delivery] → NDR Rescue Web App
                                     ↓
                           POST /api/trigger-call
                                     ↓
                        Bolna AI V2 API (agent: de639b14)
                        ElevenLabs voice "Nila" (Indian EN)
                        GPT-4o-mini extraction
                                     ↓
                    [Bolna calls customer via Twilio/PSTN]
                                     ↓
                    POST /api/webhook/bolna (ngrok tunnel)
                                     ↓
                     State machine: FAILED → CALL_SCHEDULED
                                         → REDELIVERY_CONFIRMED
                                     ↓
                          Ops dashboard updates live
```

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- Docker (for Postgres)
- Bolna API key from [app.bolna.ai](https://app.bolna.ai)

### 1. Clone & Install
```bash
git clone https://github.com/tarandeep-juneja/ndr-rescue
cd ndr-rescue
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values:
```

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://myuser:mypassword@localhost:5434/ndr_rescue` |
| `BOLNA_API_KEY` | Your key from app.bolna.ai |
| `BOLNA_AGENT_ID` | Auto-set by setup script |
| `APP_URL` | `https://your-ngrok-url.ngrok.io` (or Vercel URL) |
| `JWT_SECRET` | Any random 32-char string |
| `WEBHOOK_SECRET` | Any random string |

### 3. Start Postgres
```bash
docker-compose up -d
```

### 4. Run Migrations & Seed
```bash
npx prisma migrate deploy
npm run seed
# Creates: 1 org, 1 operator (demo@logistics.com / demo1234), 3 failed shipments
```

### 5. Deploy Bolna Agent
```bash
npm run setup-bolna
# Creates the voice agent, prints BOLNA_AGENT_ID → paste into .env
```

### 6. Expose Webhook (for real calls)
```bash
ngrok http 3000
# Copy HTTPS URL → set APP_URL in .env → re-run: npm run setup-bolna
```

### 7. Start App
```bash
npm run dev
# → http://localhost:3000
```

**Login:** `demo@logistics.com` / `demo1234`

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/login` | Split-panel auth with demo credentials pre-filled |
| `/dashboard` | KPI cards, 7-day recovery trend chart, recent shipments |
| `/shipments` | Full queue with filter tabs, search, Trigger Call button |
| `/shipments/[id]` | Detail: call timeline, AI transcript, extracted data |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Cookie-based auth |
| `GET` | `/api/shipments` | List all shipments |
| `GET` | `/api/shipments/[id]` | Shipment + call history |
| `POST` | `/api/trigger-call` | Queue Bolna voice call |
| `POST` | `/api/webhook/bolna` | Receive call completion |
| `GET` | `/api/dashboard` | KPI + weekly trend data |
| `POST` | `/api/dev/simulate-bolna-webhook` | Dev-only: simulate completion |

## 🧪 Testing

```bash
# Unit tests (42 tests)
npm test

# E2E tests (6 Playwright specs)
npx playwright install
npm run test:e2e
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | PostgreSQL via Prisma 7 + adapter-pg |
| Voice AI | Bolna V2 API + ElevenLabs (Nila voice) |
| LLM | GPT-4o-mini (slot extraction) |
| UI | Inter + Material Symbols, Recharts |
| Design | Stitch MCP (Wispr Flow aesthetic) |
| Auth | JWT + HTTP-only cookies |
| Testing | Vitest + Playwright |

## 📊 Business Metrics (Demo Data)

- **Recovery Rate**: 33%+ from first run
- **Cost per call**: ₹4 (vs ₹45 human agent)
- **Time to resolution**: <5 min (vs 24-48hrs manual)
- **ROI**: 11x cost reduction per recovered shipment

## 🔐 Webhook Security

All Bolna callbacks verified via HMAC `?secret=` parameter. Idempotency guard prevents duplicate state updates if Bolna sends the same webhook twice.

## 📁 Project Structure

```
bolna/
├── prisma/
│   ├── schema.prisma          # 5 models: Org, Operator, Shipment, CallExecution, AuditEvent
│   └── seed/seed.ts           # Demo data seeder (resets to clean state)
├── bolna/
│   └── agent-config.json      # Bolna V2 agent schema
├── scripts/
│   └── setup-bolna-agent.ts   # Automated agent deployment
├── src/
│   ├── app/
│   │   ├── api/               # All API routes
│   │   ├── login/             # Auth page
│   │   ├── dashboard/         # KPI overview
│   │   └── shipments/         # Queue + detail
│   └── lib/
│       ├── prisma.ts          # Prisma client singleton
│       └── auth.ts            # JWT helpers
└── stitch-html/               # Stitch MCP design exports
```

---

## 📝 Assignment Notes

This project solves the **NDR (Non-Delivery Report) recovery problem** in Indian e-commerce logistics — one of Bolna AI's own flagship use cases. The platform demonstrates:

1. **Real voice AI integration** — actual Bolna V2 API calls with live Twilio routing
2. **Production-grade backend** — idempotent webhooks, Prisma migrations, JWT auth
3. **Enterprise UI** — Stitch MCP-generated design system matching Wispr Flow aesthetics
4. **Full observability** — every call state transition is audited and displayed

**Author**: Tarandeep Singh Juneja  
**Submission**: [Google Form](https://forms.gle/g2YpvmjZm4ufb87XA)
