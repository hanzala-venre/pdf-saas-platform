import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Check if subscription is expired
    const isExpired = user.subscriptionCurrentPeriodEnd && now > user.subscriptionCurrentPeriodEnd
    const effectivePlan = isExpired ? "free" : user.subscriptionPlan

    // Get operations this month
    const operationsThisMonth = await prisma.pdfOperation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    })

    // Get recent operations
    const recentOperations = await prisma.pdfOperation.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    })

    // No operation limits - unlimited usage for all users
    const operationsLimit = 999999

    return NextResponse.json({
      operationsThisMonth,
      operationsLimit,
      recentOperations,
      subscription: effectivePlan,
      subscriptionStatus: user.subscriptionStatus,
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
