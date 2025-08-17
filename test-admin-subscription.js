const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAdminSubscription() {
  try {
    console.log('🧪 Testing admin subscription logic...\n')

    // Get an admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        email: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      }
    })

    if (!adminUser) {
      console.log('❌ No admin users found!')
      return
    }

    console.log(`👤 Testing with admin user: ${adminUser.email}`)
    console.log(`📋 User data:`, adminUser)

    // Simulate the subscription API logic
    const isAdmin = adminUser.role === "ADMIN"
    console.log(`🔑 Is Admin: ${isAdmin}`)

    if (isAdmin) {
      const adminResponse = {
        plan: "pro",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: adminUser.stripeCustomerId,
        stripeSubscriptionId: adminUser.stripeSubscriptionId,
        isAdmin: true,
      }
      console.log('✅ Admin subscription response:', adminResponse)
    } else {
      console.log('❌ Admin detection failed!')
    }

    // Test regular subscription logic for comparison
    console.log('\n📊 Regular subscription logic test:')
    const now = new Date()
    const periodEnd = adminUser.subscriptionCurrentPeriodEnd
    const isExpired = periodEnd && now > periodEnd
    
    const effectiveStatus = isExpired ? "inactive" : adminUser.subscriptionStatus
    const effectivePlan = isExpired ? "free" : adminUser.subscriptionPlan

    const regularResponse = {
      plan: effectivePlan,
      status: effectiveStatus,
      currentPeriodEnd: adminUser.subscriptionCurrentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: adminUser.stripeCustomerId,
      stripeSubscriptionId: adminUser.stripeSubscriptionId,
      isAdmin: isAdmin, // This should be true for admin
    }

    console.log('📋 Regular subscription response:', regularResponse)

    console.log('\n✅ Test completed!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminSubscription()
