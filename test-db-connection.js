const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    const users = await prisma.user.count()
    console.log(`✅ Database connection successful. Found ${users} users.`)
    
    // Test creating a dummy user to ensure write access
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      subscriptionPlan: 'free',
      subscriptionStatus: 'inactive'
    }
    
    const createdUser = await prisma.user.create({
      data: testUser
    })
    console.log('✅ Write access confirmed. Created test user:', createdUser.id)
    
    // Clean up
    await prisma.user.delete({
      where: { id: createdUser.id }
    })
    console.log('✅ Cleanup completed.')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
