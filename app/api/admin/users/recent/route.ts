import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: true,
        createdAt: true,
      },
    })

    // Map the results to match the expected interface
    const mappedUsers = recentUsers.map(user => ({
      ...user,
      subscription: user.subscriptionPlan, // Map new field to old interface
    }))

    return NextResponse.json(mappedUsers)
  } catch (error) {
    console.error("Error fetching recent users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
