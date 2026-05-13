/**
 * Bolna Agent Setup Script — v2 API
 * 
 * Creates or updates the NDR Rescue AI agent on the Bolna platform.
 * 
 * Usage:
 *   BOLNA_API_KEY=... APP_URL=... npm run setup-bolna
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const BOLNA_API_KEY = process.env.BOLNA_API_KEY
const BOLNA_BASE_URL = 'https://api.bolna.ai'
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'my-super-secret-webhook-key'

if (!BOLNA_API_KEY || BOLNA_API_KEY.startsWith('your-')) {
  console.error('❌ BOLNA_API_KEY is not set. Set it in .env before running this script.')
  process.exit(1)
}

async function bolnaFetch(endpoint: string, options: RequestInit) {
  const url = `${BOLNA_BASE_URL}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${BOLNA_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const body = await res.text()
  if (!res.ok) {
    throw new Error(`Bolna API ${endpoint} → ${res.status}: ${body}`)
  }
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

async function listAgents(): Promise<{ agent_id: string; agent_name: string }[]> {
  try {
    const res = await bolnaFetch('/v2/agent/all', { method: 'GET' })
    return Array.isArray(res) ? res : res.agents ?? []
  } catch (e) {
    console.warn('  Could not list agents:', (e as Error).message)
    return []
  }
}

async function setupAgent(): Promise<string> {
  const configPath = path.join(__dirname, '../bolna/agent-config.json')
  const rawConfig = fs.readFileSync(configPath, 'utf-8')
  const config = JSON.parse(
    rawConfig
      .replace(/\{\{APP_URL\}\}/g, APP_URL)
      .replace(/\{\{WEBHOOK_SECRET\}\}/g, WEBHOOK_SECRET)
  )

  const agentName: string = config.agent_config.agent_name

  console.log('🔍 Checking for existing agent…')
  const agents = await listAgents()
  const existing = agents.find((a) => a.agent_name === agentName)

  let agentId: string
  if (existing) {
    console.log(`♻️  Updating existing agent: ${existing.agent_id}`)
    await bolnaFetch(`/v2/agent/${existing.agent_id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    })
    agentId = existing.agent_id
    console.log(`✅ Agent updated: ${agentId}`)
  } else {
    console.log('✨ Creating new agent…')
    const result = await bolnaFetch('/v2/agent', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    agentId = result.agent_id ?? result.id
    console.log(`✅ Agent created: ${agentId}`)
  }

  return agentId
}

async function writeEnvAgentId(agentId: string) {
  const envPath = path.join(__dirname, '../.env')
  let env = fs.readFileSync(envPath, 'utf-8')
  if (env.includes('BOLNA_AGENT_ID=')) {
    env = env.replace(/BOLNA_AGENT_ID=.*/g, `BOLNA_AGENT_ID="${agentId}"`)
  } else {
    env += `\nBOLNA_AGENT_ID="${agentId}"\n`
  }
  fs.writeFileSync(envPath, env)
  console.log(`\n💾 BOLNA_AGENT_ID="${agentId}" written to .env`)
}

async function main() {
  console.log('🚀 NDR Rescue — Bolna Agent Setup (v2 API)\n')
  console.log(`  API Key: ${BOLNA_API_KEY!.slice(0, 8)}…`)
  console.log(`  App URL: ${APP_URL}`)
  console.log(`  Webhook: ${APP_URL}/api/webhook/bolna\n`)

  const agentId = await setupAgent()
  await writeEnvAgentId(agentId)

  console.log('\n🎉 Setup complete!')
  console.log('   Next: run `npm run dev` to start the app.')
  console.log(`   View agent: https://platform.bolna.ai`)
}

main().catch((e) => {
  console.error('❌ Setup failed:', e.message)
  process.exit(1)
})
