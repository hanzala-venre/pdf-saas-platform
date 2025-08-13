/**
 * Script to create Stripe products and prices for PDF SaaS platform
 * Run this once to set up your subscription plans in Stripe
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

async function createStripeProducts() {
  try {
    console.log('Creating QuikPDF product and prices...')

    // Create the main product
    const product = await stripe.products.create({
      name: 'QuikPDF',
      description: 'Professional PDF processing tools with unlimited operations',
      metadata: {
        type: 'subscription'
      }
    })

    console.log('✅ Created product:', product.id)

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 199, // $1.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      lookup_key: 'monthly',
      metadata: {
        plan: 'monthly'
      }
    })

    console.log('✅ Created monthly price:', monthlyPrice.id)

    // Create yearly price  
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 1999, // $19.99 in cents
      currency: 'usd', 
      recurring: {
        interval: 'year',
      },
      lookup_key: 'yearly',
      metadata: {
        plan: 'yearly'
      }
    })

    console.log('✅ Created yearly price:', yearlyPrice.id)

    console.log('\n🎉 All done! Add these to your environment variables:')
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`)
    console.log(`STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}`)

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error)
  }
}

// Run the script
createStripeProducts()
