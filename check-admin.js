const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAdminUser() {
  try {
    console.log("🔍 Checking admin users in database...")
    
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log("👤 Admin users found:", adminUsers.length)
    adminUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Created: ${user.createdAt}`)
    })
    
    if (adminUsers.length === 0) {
      console.log("❌ No admin users found!")
    } else {
      console.log("✅ Admin users are properly configured!")
    }
    
    // Also check all users to see their roles
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      take: 10
    })
    
    console.log("📋 Sample of all users:")
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`)
    })
    
  } catch (error) {
    console.error("❌ Database error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminUser()
