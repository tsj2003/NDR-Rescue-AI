# 🚀 NDR Rescue AI — Bolna Full Stack Engineering Assignment

**Built by:** Tarandeep Singh Juneja  
**Video Demo:** [Link to Google Drive/YouTube Demo here]  
**Live App:** [Insert Vercel Link here if applicable]  

Hey Bolna Team! 👋 This is my submission for the Full Stack Engineer assignment. Instead of building a generic AI caller, I decided to tackle a massive, expensive problem plaguing the Indian D2C e-commerce ecosystem: **Non-Delivery Reports (NDRs)**. 

Here is how I solved all 5 assignment objectives.

---

## 🎯 Objective 1: Identify a Real Enterprise Use Case

**The Problem:** 
Indian e-commerce loses ₹4,500+ crore annually to failed deliveries. When a delivery fails (customer unavailable, wrong address), logistics partners mark it as an NDR. Operations teams currently have to manually call customers to fix the issue, costing ₹45+ per call. This is unscalable, slow, and leads to massive Return to Origin (RTO) losses.

**The Workflow:** 
1. Delivery fails → System detects NDR.
2. AI Agent immediately calls the customer (within 5 minutes).
3. AI explains the failure, extracts a new delivery slot/address.
4. Logistics ops dashboard updates in real-time.

**The Outcome Metric:**
- **Cost Reduction:** From ₹45/manual call to ~₹4/AI call.
- **RTO Reduction:** Expected 30-40% drop in RTOs due to instant resolution before the package is returned to the warehouse.

---

## 🤖 Objective 2: Voice AI Agent on Bolna

I used the **Bolna V2 API** to build the agent. 

**What makes this implementation special?**
- **Dynamic Prompt Variables:** Instead of a generic IVR, the agent's memory is injected live via the `user_data` payload. It knows the exact `{customerName}`, `{trackingNumber}`, `{dropAddress}`, and `{failureReason}` before it even says hello.
- **Real-Time Context Switching:** As seen in my demo recording, the agent seamlessly handles interruptions, name corrections, and even switches to Hindi mid-conversation while retaining the address details.
- **Automated Infrastructure:** I wrote a custom Node script (`scripts/setup-bolna-agent.ts`) that programmatically configures the agent, the Deepgram STT, ElevenLabs TTS, and the webhook URL directly via Bolna's REST API. 

---

## 💻 Objective 3 & 4: The Web App & Full Flow Demonstration

I built a production-ready **Next.js 16 App Router** platform backed by **PostgreSQL (Prisma)**. 

### 🌊 The Full Flow:
1. **User (Ops Team):** Logs into the beautiful glassmorphism dashboard.
2. **Web App:** Displays pending failed deliveries (NDRs). The user clicks "Trigger Call".
3. **Agent:** Our Next.js backend pings the Bolna V2 API, which initiates the live call.
4. **Backend Logic (The Brain):** 
   - A robust Webhook Handler (`/api/webhook/bolna`) listens for Bolna events.
   - It parses the AI's extracted JSON data.
   - **Fallback Engine:** If the LLM extraction fails, I built a regex-based fallback that parses the raw call transcript to extract delivery slot times.
5. **Output:** The DB state machine strictly transitions the shipment from `FAILED_ATTEMPT` → `CALL_SCHEDULED` → `REDELIVERY_CONFIRMED` and reflects this live on the UI.

---

## 📸 Architecture Visualized

![NDR Rescue Architecture](architecture.png)

```text
Customer → [Failed Delivery] → NDR Rescue Web App
                                     ↓
                           POST /api/trigger-call (Injects Variables)
                                     ↓
                        Bolna AI V2 Agent (Deepgram + OpenAI + ElevenLabs)
                                     ↓
                    [Bolna calls customer via Twilio/PSTN]
                                     ↓
                 POST /api/webhook/bolna (Next.js Webhook Endpoint)
                                     ↓
             State Machine Validation + Transcript Extraction Fallback
                                     ↓
                      Ops Dashboard Updates in Real-Time
```

---

## 🚀 Quick Start (Run it Locally)

### 1. Clone & Install
```bash
git clone https://github.com/tsj2003/NDR-Rescue-AI.git
cd NDR-Rescue-AI
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5434/ndr_rescue"
BOLNA_API_KEY="your-bolna-api-key"
APP_URL="https://your-ngrok-url.ngrok-free.dev" # Or Vercel URL
JWT_SECRET="supersecret"
WEBHOOK_SECRET="my-super-secret-webhook-key"
```

### 3. Start Database & Seed Data
```bash
docker-compose up -d
npx prisma migrate deploy
npm run seed
```

### 4. Deploy the Bolna Agent
```bash
npm run setup-bolna
# This automatically creates the agent on Bolna and saves the BOLNA_AGENT_ID to your .env
```

### 5. Start the App
```bash
npm run dev
```
**Login credentials:** `demo@logistics.com` / `demo1234`

---
*Built with ❤️ for the Bolna engineering team.*
