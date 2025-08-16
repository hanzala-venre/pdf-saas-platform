import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService } from '@/lib/email-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log(`🧪 Testing email for user: ${user.email}`)
    
    // Test payment confirmation email
    await emailService.sendPaymentEmails({
      userName: user.name || 'Test User',
      userEmail: user.email,
      planName: 'MONTHLY',
      amount: 1999, // $19.99
      currency: 'usd',
      transactionId: 'test_' + Date.now(),
      billingPeriod: 'Monthly'
    })
    
    console.log('✅ Test email sent successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully. Check your inbox (and spam folder).',
      userEmail: user.email 
    })
    
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
