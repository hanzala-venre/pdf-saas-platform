import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Add timeout and error handling for database operations
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if database is available
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError) {
      console.error("Database connection error:", dbError)
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1)

    // User Analytics
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          pdfOperations: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ])

    // User growth data (last 30 days)
    const userGrowthData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const usersUpToDate = await prisma.user.count({
        where: {
          createdAt: {
            lte: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      })

      const newUsersOnDate = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      })

      userGrowthData.push({
        date: dateStr,
        users: usersUpToDate,
        newUsers: newUsersOnDate,
      })
    }

    // Subscription distribution
    const subscriptionCounts = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      _count: {
        subscriptionPlan: true,
      },
    })

    const subscriptionDistribution = subscriptionCounts.map((item: any) => ({
      plan: item.subscriptionPlan,
      count: item._count.subscriptionPlan,
      percentage: Math.round((item._count.subscriptionPlan / totalUsers) * 100),
    }))

    // Operation Analytics
    const [
      totalOperations,
      operationsToday,
      operationsThisWeek,
      operationsThisMonth,
    ] = await Promise.all([
      prisma.pdfOperation.count(),
      prisma.pdfOperation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.pdfOperation.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.pdfOperation.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ])

    // Operations by type
    const operationsByType = await prisma.pdfOperation.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
    })

    const formattedOperationsByType = operationsByType.map((item: any) => ({
      type: item.type,
      count: item._count.type,
      percentage: Math.round((item._count.type / totalOperations) * 100),
    }))

    // Operations over time (last 30 days)
    const operationsOverTime = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const [operations, successfulOperations] = await Promise.all([
        prisma.pdfOperation.count({
          where: {
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
            },
          },
        }),
        prisma.pdfOperation.count({
          where: {
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
            },
            status: 'COMPLETED',
          },
        }),
      ])

      operationsOverTime.push({
        date: dateStr,
        operations,
        successRate: operations > 0 ? Math.round((successfulOperations / operations) * 100) : 100,
      })
    }

    // Calculate average processing time and success rate
    const completedOperations = await prisma.pdfOperation.findMany({
      where: {
        status: 'COMPLETED',
        processingTime: { not: null },
      },
      select: {
        processingTime: true,
      },
    })

    const averageProcessingTime = completedOperations.length > 0
      ? completedOperations.reduce((sum: number, op: any) => sum + (op.processingTime || 0), 0) / completedOperations.length
      : 0

    const successfulOperationsCount = await prisma.pdfOperation.count({
      where: { status: 'COMPLETED' },
    })

    const successRate = totalOperations > 0
      ? Math.round((successfulOperationsCount / totalOperations) * 100)
      : 100

    const userAnalytics = {
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      userGrowthData,
      subscriptionDistribution,
      geographicDistribution: [], // Would need additional data collection
    }

    const operationAnalytics = {
      totalOperations,
      operationsToday,
      operationsThisWeek,
      operationsThisMonth,
      operationsByType: formattedOperationsByType,
      operationsOverTime,
      averageProcessingTime,
      successRate,
    }

    return NextResponse.json({
      userAnalytics,
      operationAnalytics,
    })

  } catch (error) {
    console.error("Error fetching admin analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
