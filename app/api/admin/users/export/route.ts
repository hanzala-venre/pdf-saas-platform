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

    // Convert to CSV
    const csvHeader = "ID,Name,Email,Subscription,Role,Created At,Operations Count\n"
    const csvRows = users
      .map(
        (user) =>
          `${user.id},"${user.name || ""}","${user.email}","${user.subscriptionPlan}","${user.role}","${user.createdAt}","${user._count.pdfOperations}"`,
      )
      .join("\n")

    const csv = csvHeader + csvRows

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=users-export.csv",
      },
    })
  } catch (error) {
    console.error("Error exporting users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
