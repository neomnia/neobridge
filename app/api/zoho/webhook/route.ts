/**
 * Zoho Projects Webhook receiver
 * Receives incoming events from Zoho and creates admin notifications.
 */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatConversations, chatMessages } from "@/db/schema"

type AnyObj = Record<string, unknown>
function str(v: unknown): string { return v != null ? String(v) : '' }
function nested(obj: unknown, key: string): unknown {
  return obj && typeof obj === 'object' ? (obj as AnyObj)[key] : undefined
}

/** Map Zoho event types to a human-readable label */
function describeEvent(body: AnyObj): { subject: string; content: string; category: 'info' | 'action' | 'urgent' } {
  const eventType = str(body.event_type ?? body.event)
  const projectName = str(nested(body.project, 'name') ?? body.project_name) || 'Projet inconnu'
  const entityName = str(
    nested(body.task, 'name') ?? nested(body.milestone, 'name') ?? nested(body.bug, 'title') ?? body.entity_name
  )
  const actor = str(nested(body.actor, 'name') ?? body.triggered_by) || 'Zoho'

  const label = entityName ? `« ${entityName} »` : ''

  switch (eventType.toUpperCase()) {
    case 'TASKADDED':
      return { subject: `Zoho — Nouvelle tâche ${label}`, content: `Tâche ${label} ajoutée dans ${projectName} par ${actor}.`, category: 'info' }
    case 'TASKUPDATED':
      return { subject: `Zoho — Tâche mise à jour ${label}`, content: `Tâche ${label} modifiée dans ${projectName} par ${actor}.`, category: 'info' }
    case 'TASKDELETED':
      return { subject: `Zoho — Tâche supprimée ${label}`, content: `Tâche ${label} supprimée dans ${projectName} par ${actor}.`, category: 'action' }
    case 'MILESTONEADDED':
    case 'MILESTONEUPDATED':
      return { subject: `Zoho — Milestone ${label}`, content: `Milestone ${label} mis à jour dans ${projectName} par ${actor}.`, category: 'info' }
    case 'BUGADDED':
    case 'BUGUPDATED':
      return { subject: `Zoho — Bug ${label}`, content: `Bug ${label} dans ${projectName} — signalé par ${actor}.`, category: 'action' }
    default:
      return {
        subject: `Zoho — Événement reçu${eventType ? ` (${eventType})` : ''}`,
        content: `Événement Zoho reçu depuis ${projectName}${actor ? ` par ${actor}` : ''}.`,
        category: 'info',
      }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log("[Zoho Webhook]", JSON.stringify(body))

    const { subject, content, category } = describeEvent(body as Record<string, unknown>)

    // Create a system notification visible in Admin → Notifications
    const [conv] = await db
      .insert(chatConversations)
      .values({
        subject,
        category,
        status: 'open',
        priority: category === 'urgent' ? 'urgent' : category === 'action' ? 'high' : 'normal',
        metadata: { notificationType: 'zoho_webhook', raw: body },
      })
      .returning({ id: chatConversations.id })

    await db.insert(chatMessages).values({
      conversationId: conv.id,
      senderType: 'system',
      senderName: 'Zoho Projects',
      content,
      messageType: 'system',
      isRead: false,
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[Zoho Webhook] error:", err)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
}
