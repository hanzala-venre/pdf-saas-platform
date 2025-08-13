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

    // Get operations statistics
    const [
      total,
      completed,
      failed,
      processing
    ] = await Promise.all([
      prisma.pdfOperation.count(),
      prisma.pdfOperation.count({ where: { status: 'COMPLETED' } }),
      prisma.pdfOperation.count({ where: { status: 'FAILED' } }),
      prisma.pdfOperation.count({ where: { status: 'PROCESSING' } })
    ])

    // Get operations by type
    const operationsByType = await prisma.pdfOperation.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
    })

    const byType = operationsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type
      return acc
    }, {} as Record<string, number>)

    // Calculate success rate
    const successRate = total > 0 ? (completed / total) * 100 : 0

    const stats = {
      total,
      completed,
      failed,
      processing,
      byType,
      successRate
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching operations stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
