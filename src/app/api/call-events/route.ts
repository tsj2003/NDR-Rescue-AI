import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getShipmentSnapshot(shipmentId: string) {
  return prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      callExecutions: { orderBy: { createdAt: 'desc' } },
      auditEvents: { orderBy: { createdAt: 'desc' }, take: 8 },
    },
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const shipmentId = url.searchParams.get('shipmentId')
  if (!shipmentId) return new Response('shipmentId is required', { status: 400 })
  const shipmentIdValue = shipmentId

  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      async function send() {
        try {
          const shipment = await getShipmentSnapshot(shipmentIdValue)
          if (!shipment) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'not_found' })}\n\n`))
            return
          }
          controller.enqueue(encoder.encode(`event: shipment\ndata: ${JSON.stringify(shipment)}\n\n`))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'stream_error'
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`))
        }
      }

      await send()
      timer = setInterval(send, 2000)

      req.signal.addEventListener('abort', () => {
        if (timer) clearInterval(timer)
        try {
          controller.close()
        } catch {
          // The client may already have closed the connection.
        }
      })
    },
    cancel() {
      if (timer) clearInterval(timer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
