// Stripe configuration
export const STRIPE_CONFIG = {
  plans: {
    monthly: {
      priceId: process.env.STRIPE_MONTHLY_PRICE_ID || "price_1RqAPoGZ8mm0itKr8cTonard", // Replace with actual monthly price ID
      lookupKey: "monthly",
      name: "Monthly Pro",
      price: 1.99,
      interval: "month"
    },
    yearly: {
      priceId: process.env.STRIPE_YEARLY_PRICE_ID || "price_1RqAQBGZ8mm0itKr6sKWp6Mg", // Replace with actual yearly price ID  
      lookupKey: "yearly",
      name: "Yearly Pro", 
      price: 19.99,
      interval: "year"
    },
    oneTime: {
      priceId: process.env.STRIPE_ONE_TIME_PRICE_ID || "price_1RrbrPGZ8mm0itKrX0QCUPbQ", // One-time watermark removal
      lookupKey: "oneTime",
      name: "One-Time Watermark Removal",
      price: 2.49,
      interval: "one_time"
    }
  }
}

export function getPriceId(plan: string): string {
  const planConfig = STRIPE_CONFIG.plans[plan as keyof typeof STRIPE_CONFIG.plans]
  if (!planConfig) {
    throw new Error(`Invalid plan: ${plan}`)
  }
  return planConfig.priceId
}
