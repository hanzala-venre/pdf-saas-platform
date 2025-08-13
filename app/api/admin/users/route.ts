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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            pdfOperations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Map the results to match the expected interface
    const mappedUsers = users.map(user => ({
      ...user,
      subscription: user.subscriptionPlan, // Map new field to old interface
    }))

    return NextResponse.json(mappedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
