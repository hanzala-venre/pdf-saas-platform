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

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

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

    const usage = await prisma.usageStats.findUnique({
      where: {
        userId_month_year: {
          userId: user.id,
          month: currentMonth,
          year: currentYear,
        },
      },
    })

    // Check if subscription is expired
    const isExpired = user.subscriptionCurrentPeriodEnd && now > user.subscriptionCurrentPeriodEnd
    const effectivePlan = isExpired ? "free" : user.subscriptionPlan

    const isPaid = effectivePlan !== "free"
    const limit = isPaid ? 999999 : 10
    const currentUsage = usage?.operationsCount || 0

    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
    const resetDate = new Date(nextYear, nextMonth - 1, 1)

    return NextResponse.json({
      currentMonth: currentUsage,
      limit,
      resetDate: resetDate.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
