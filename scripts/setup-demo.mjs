import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('docker', ['compose', 'up', '-d'])
run('npx', ['prisma', 'migrate', 'deploy'])
run('npm', ['run', 'seed'])

console.log(`
NDR Rescue demo is ready.

Run:
  npm run dev

Open:
  http://localhost:3000/login

Demo login:
  demo@logistics.com / demo1234

Fallback demo:
  Trigger a shipment call, open the shipment detail page, then click "No answer".
`)
