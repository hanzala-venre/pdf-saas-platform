import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        pdfOperations: true,
        usageStats: true,
      },
    })

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Remove sensitive data
    const { password, ...safeUserData } = userData

    const exportData = {
      user: safeUserData,
      exportDate: new Date().toISOString(),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=user-data.json",
      },
    })
  } catch (error) {
    console.error("Error exporting user data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
