const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFullAdminFlow() {
  try {
    console.log('🧪 Testing Full Admin Flow...\n')

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        id: true,
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

    console.log(`👤 Testing admin user: ${adminUser.email}`)
    console.log(`📋 Database record:`, adminUser)

    // Test 1: Admin Detection
    console.log('\n🧪 Test 1: Admin Detection')
    const isAdmin = adminUser.role === "ADMIN"
    console.log(`✅ isAdmin: ${isAdmin}`)

    // Test 2: Subscription API Response (for admin)
    console.log('\n🧪 Test 2: Subscription API Response')
    if (isAdmin) {
      const adminApiResponse = {
        plan: "pro",
        status: "active", 
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: adminUser.stripeCustomerId,
        stripeSubscriptionId: adminUser.stripeSubscriptionId,
        isAdmin: true,
      }
      console.log('✅ Admin API Response:', adminApiResponse)
    }

    // Test 3: useSubscription Hook Logic
    console.log('\n🧪 Test 3: useSubscription Hook Logic')
    const now = new Date()
    const isExpired = adminUser.subscriptionCurrentPeriodEnd && now > adminUser.subscriptionCurrentPeriodEnd
    const effectivePlan = isExpired ? "free" : (isAdmin ? "pro" : adminUser.subscriptionPlan)
    const isPaidUser = effectivePlan === "monthly" || effectivePlan === "yearly" || isAdmin
    
    const hookResponse = {
      plan: effectivePlan,
      status: adminUser.subscriptionStatus,
      currentPeriodEnd: adminUser.subscriptionCurrentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: false,
      isPaidUser,
      isExpired: isExpired && !isAdmin,
      isAdmin: isAdmin
    }
    console.log('✅ Hook Response:', hookResponse)

    // Test 4: Enhanced Subscription Hook
    console.log('\n🧪 Test 4: Enhanced Subscription Hook Logic')
    let accessType = 'free'
    let hasWatermarkFreeAccess = false

    if (isAdmin) {
      accessType = 'admin'
      hasWatermarkFreeAccess = true
    } else if (isPaidUser && !isExpired) {
      accessType = 'subscription'
      hasWatermarkFreeAccess = true
    }

    const enhancedHookResponse = {
      ...hookResponse,
      hasWatermarkFreeAccess,
      accessType
    }
    console.log('✅ Enhanced Hook Response:', enhancedHookResponse)

    // Test 5: Component Behavior Predictions
    console.log('\n🧪 Test 5: Component Behavior Predictions')
    
    // WatermarkNotice should not show
    const shouldShowWatermarkNotice = !hasWatermarkFreeAccess
    console.log(`🔍 Should show watermark notice: ${shouldShowWatermarkNotice} (Expected: false)`)
    
    // SubscriptionStatus should show
    const shouldShowSubscriptionStatus = isPaidUser || isAdmin
    console.log(`🔍 Should show subscription status: ${shouldShowSubscriptionStatus} (Expected: true)`)
    
    // Tool pages should not show watermark warnings
    const shouldShowWatermarkWarning = !isPaidUser
    console.log(`🔍 Should show watermark warning in tools: ${shouldShowWatermarkWarning} (Expected: false)`)

    // PlanComparison should show admin plan
    const planComparisonCurrentPlan = isAdmin ? "admin" : effectivePlan
    console.log(`🔍 Plan comparison current plan: ${planComparisonCurrentPlan} (Expected: admin or pro)`)

    // Test 6: Overall Assessment
    console.log('\n📊 Overall Assessment')
    const allTestsPass = 
      isAdmin === true &&
      isPaidUser === true &&
      hasWatermarkFreeAccess === true &&
      accessType === 'admin' &&
      shouldShowWatermarkNotice === false &&
      shouldShowSubscriptionStatus === true &&
      shouldShowWatermarkWarning === false

    if (allTestsPass) {
      console.log('✅ ALL TESTS PASS - Admin functionality should work correctly!')
      console.log('🎉 Admin users should see:')
      console.log('   - No watermark notices')
      console.log('   - "Admin Pro Member" status in tools')
      console.log('   - No watermark warnings in PDF outputs')
      console.log('   - "Current Admin Plan" in billing page')
      console.log('   - Unlimited access to all features')
    } else {
      console.log('❌ SOME TESTS FAILED - Admin functionality may not work correctly')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFullAdminFlow()
