import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createToken, setAuthCookie, removeAuthCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const admin = await requireAdmin()

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Empêcher l'impersonnation d'un super admin
    const isSuperAdmin = targetUser.userRoles.some(
      ur => ur.role.name === "super_admin"
    )

    if (isSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot impersonate a super admin" },
        { status: 403 }
      )
    }

    // Créer un nouveau token JWT pour l'utilisateur cible
    const token = createToken({
      userId: targetUser.id,
      email: targetUser.email,
      roles: targetUser.userRoles.map(ur => ur.role.name),
    })

    // Définir le cookie de session
    await setAuthCookie(token)

    // Log de l'action d'impersonnation (pour audit)
    console.log(`[IMPERSONATION] Admin ${admin.email} (${admin.userId}) is now impersonating user ${targetUser.email} (${targetUser.id})`)

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.email}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName
      }
    })

  } catch (error) {
    console.error("Error during impersonation:", error)
    return NextResponse.json(
      { error: "Failed to impersonate user" },
      { status: 500 }
    )
  }
}

// Route pour terminer l'impersonnation et revenir au compte admin
export async function DELETE(request: NextRequest) {
  try {
    // Supprimer le cookie d'impersonnation
    await removeAuthCookie()

    return NextResponse.json({
      success: true,
      message: "Impersonation ended"
    })

  } catch (error) {
    console.error("Error ending impersonation:", error)
    return NextResponse.json(
      { error: "Failed to end impersonation" },
      { status: 500 }
    )
  }
}
