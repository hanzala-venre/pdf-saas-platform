const { emailService } = require('../lib/email-service.ts')

async function testEmailSystem() {
  console.log('🧪 Testing email system...')
  
  try {
    // Test connection
    console.log('1. Testing email connection...')
    const connectionTest = await emailService.testConnection()
    if (connectionTest) {
      console.log('✅ Email connection successful')
    } else {
      console.log('❌ Email connection failed')
      return
    }

    // Test cancellation email
    console.log('2. Testing cancellation email...')
    await emailService.sendCancellationEmails({
      userName: 'Test User',
      userEmail: 'test@example.com',
      planName: 'PRO',
      accessEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subscriptionId: 'sub_test123'
    })
    console.log('✅ Cancellation email test sent')

    // Test plan change email
    console.log('3. Testing plan change email...')
    await emailService.sendPlanChangeEmails({
      userName: 'Test User',
      userEmail: 'test@example.com',
      oldPlan: 'BASIC',
      newPlan: 'PRO',
      effectiveDate: new Date().toLocaleDateString()
    })
    console.log('✅ Plan change email test sent')

    console.log('🎉 All email tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Email test failed:', error)
  }
}

testEmailSystem()
