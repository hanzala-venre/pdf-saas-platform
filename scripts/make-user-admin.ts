import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeUserAdmin(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email: email },
    })

    if (!user) {
      console.log('❌ User not found with email:', email)
      return
    }

    console.log('✅ User found:', user.name || user.email)
    console.log('Current role:', user.role)

    if (user.role === 'ADMIN') {
      console.log('👑 User is already an admin!')
      return
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { role: 'ADMIN' },
    })

    console.log('🎉 Successfully made user admin!')
    console.log('Updated user:', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    })

  } catch (error) {
    console.error('❌ Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
  console.log('❌ Please provide an email address')
  console.log('Usage: npm run make-admin <email>')
  console.log('Example: npm run make-admin admin@example.com')
  process.exit(1)
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.log('❌ Please provide a valid email address')
  process.exit(1)
}

console.log('🚀 Making user admin...')
makeUserAdmin(email)
