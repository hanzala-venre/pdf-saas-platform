import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's processing history
    const history = await prisma.pdfOperation.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100, // Limit to last 100 operations
      select: {
        id: true,
        type: true,
        fileName: true,
        status: true,
        createdAt: true,
        fileSize: true,
        resultUrl: true
      }
    })

    return NextResponse.json({ 
      history: history.map(item => ({
        id: item.id,
        type: item.type,
        fileName: item.fileName || 'Unknown file',
        status: item.status.toLowerCase(),
        createdAt: item.createdAt.toISOString(),
        fileSize: item.fileSize,
        downloadUrl: item.resultUrl
      }))
    })

  } catch (error) {
    console.error('Error fetching user history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Clear all history for user
    await prisma.pdfOperation.deleteMany({
      where: {
        userId: user.id
      }
    })

    return NextResponse.json({ message: 'History cleared successfully' })

  } catch (error) {
    console.error('Error clearing user history:', error)
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    )
  }
}
