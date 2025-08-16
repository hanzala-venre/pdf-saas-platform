import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete the specific operation if it belongs to the user
    const result = await prisma.pdfOperation.deleteMany({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Operation not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ message: 'History item deleted successfully' })

  } catch (error) {
    console.error('Error deleting history item:', error)
    return NextResponse.json(
      { error: 'Failed to delete history item' },
      { status: 500 }
    )
  }
}
