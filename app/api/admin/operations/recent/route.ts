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

    const recentOperations = await prisma.pdfOperation.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(recentOperations)
  } catch (error) {
    console.error("Error fetching recent operations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
