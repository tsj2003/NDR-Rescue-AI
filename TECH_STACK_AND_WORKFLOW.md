# NDR Rescue AI: Tech Stack & System Workflow

This document provides a comprehensive overview of the architecture, technologies used, and the step-by-step system workflow for the NDR (Non-Delivery Report) Rescue AI agent.

**Live Link:** [https://ndrrescue.netlify.app](https://ndrrescue.netlify.app)

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Native CSS (`.css` files, custom design system inspired by modern Light/Serif aesthetics)
- **Deployment**: Netlify Edge Functions

### Backend & API
- **Framework**: Next.js API Routes (Serverless)
- **Language**: TypeScript
- **Architecture**: RESTful webhooks

### Database & ORM
- **Database**: PostgreSQL (Hosted on Neon Serverless Postgres)
- **ORM**: Prisma (v7)
- **Connection**: Pooled connections via Neon for serverless compatibility

### AI Agent Platform
- **Voice Agent Provider**: Bolna (V2 API)
- **LLM Context**: Prompt-engineered system prompt utilizing `{variables}` for dynamic injection
- **Capabilities**: Conversational AI, slot-booking intent recognition, speech-to-text, and real-time webhook signaling

### Infrastructure & Operations
- **Local Tunneling**: ngrok (Used during development for local webhook testing)
- **Deployment & Hosting**: Netlify
- **Version Control**: Git / GitHub

---

## 🔄 System Workflow (Step-by-Step)

The NDR Rescue system is an end-to-end automated workflow designed to react to failed delivery attempts by triggering a voice AI agent to instantly call the customer and reschedule the delivery slot.

### Step 1: Shipment Ingestion (The Trigger)
1. The logistics system marks a shipment's status as `Failed Attempt` (e.g., due to Customer Not Available, Gate Locked, etc.).
2. The operational dashboard (the Next.js app) reads this state from the Neon PostgreSQL database.

### Step 2: Agent Invocation
1. An operator clicks **"Trigger Call"** on the dashboard.
2. The frontend makes a `POST` request to the internal `/api/trigger-call` route.
3. The backend fetches the shipment details (Customer Name, Tracking ID, Phone Number) from the database.
4. The backend makes an API request to the **Bolna V2 `/agent/invoke` endpoint**, passing the customer's phone number and injecting their specific details into the `user_data` payload.
5. The shipment status updates to `Call Scheduled` in the database.

### Step 3: The Voice AI Call
1. Bolna dials the customer's phone number.
2. The Agent greets the customer personally using the injected variables (e.g., *"Hi Priya, calling regarding your recent package TRK10001..."*).
3. The Agent engages in a natural conversation to determine the best time to reschedule the delivery (e.g., "Tomorrow morning" or "Later today").
4. Once the customer agrees to a time, the call concludes.

### Step 4: Webhook Processing
1. Immediately after the call ends, Bolna sends an automated `POST` webhook to the app's exposed endpoint (`/api/webhook/bolna`).
2. The webhook payload contains the **call transcript** and the **extracted JSON parameters** (e.g., `{"rescheduled_time": "Tomorrow at 10 AM"}`).
3. The backend validates the webhook secret using an HMAC signature to ensure security.

### Step 5: Database Update & Analytics
1. The backend parses the Bolna webhook data.
2. It updates the Prisma database, marking the shipment status as `Recovered` and saving the new `rescheduledTime`.
3. The dashboard UI immediately reflects this success state, moving the shipment to the "Recovered" tab and updating overall operational analytics.
