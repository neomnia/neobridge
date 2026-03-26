/**
 * Zoho Projects Webhook receiver
 * Receives incoming events from Zoho and stores/broadcasts them.
 */
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[Zoho Webhook]", JSON.stringify(body))

    // TODO: broadcast to SSE clients via a shared event bus (Redis pub/sub etc.)
    // For now, just acknowledge receipt.
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
