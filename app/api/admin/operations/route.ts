import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get recent operations with user information
    const operations = await prisma.pdfOperation.findMany({
      take: 50, // Get more operations for the admin view
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })

    return NextResponse.json(operations)
  } catch (error) {
    console.error("Error fetching operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
