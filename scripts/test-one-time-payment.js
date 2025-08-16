/**
 * Test script for one-time payment credit consumption
 */

// Test that the new model is available
async function testPrismaModel() {
  const { prisma } = require('../lib/prisma')
  
  try {
    // Test creating a consumed payment record
    const testRecord = await prisma.consumedOneTimePayment.create({
      data: {
        purchaseId: 'test_purchase_123',
        operationType: 'COMPRESS',
        consumedAt: new Date()
      }
    })
    
    console.log('✅ Successfully created test record:', testRecord)
    
    // Test finding the record
    const foundRecord = await prisma.consumedOneTimePayment.findUnique({
      where: { purchaseId: 'test_purchase_123' }
    })
    
    console.log('✅ Successfully found test record:', foundRecord)
    
    // Clean up
    await prisma.consumedOneTimePayment.delete({
      where: { purchaseId: 'test_purchase_123' }
    })
    
    console.log('✅ Successfully cleaned up test record')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPrismaModel()
