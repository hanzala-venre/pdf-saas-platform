import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeAdmin() {
  try {
    // Get the most recent user
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, role: true, name: true }
    })

    console.log('Recent users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role}`)
    })

    if (users.length > 0) {
      const latestUser = users[0]
      console.log(`\nMaking ${latestUser.email} an admin...`)
      
      const updatedUser = await prisma.user.update({
        where: { id: latestUser.id },
        data: { role: 'ADMIN' }
      })

      console.log(`✅ ${updatedUser.email} is now an admin!`)
    } else {
      console.log('No users found in database')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin()
