# Vercel Deployment Guide

This guide will help you deploy your PDF SaaS platform to Vercel with the proper configuration.

## Prerequisites

1. Vercel account
2. Stripe account (for payments)
3. PostgreSQL database (Supabase recommended)
4. Email service (Gmail SMTP or similar)

## Environment Variables Setup

Set these environment variables in your Vercel project settings:

### Database
```
DATABASE_URL=postgresql://postgres.xxx:password@host:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:password@host:5432/postgres
```

### NextAuth
```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_MONTHLY_PRICE_ID=price_your-monthly-price-id
STRIPE_YEARLY_PRICE_ID=price_your-yearly-price-id
STRIPE_ONE_TIME_PRICE_ID=price_your-one-time-price-id
STRIPE_WEBHOOK_SECRET_PROD=whsec_your-production-webhook-secret
```

### Other Services
```
FASTAPI_BASE_URL=https://your-python-service.onrender.com
NEXT_PUBLIC_GA_ID=your-ga-tracking-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@your-domain.com
COMPANY_NAME=Your Company Name
```

## Build Configuration

The project is configured to:
- ✅ Skip TypeScript type checking during build
- ✅ Skip ESLint during build
- ✅ Automatically run `prisma generate` before build
- ✅ Use environment-specific Stripe webhook secrets
- ✅ Set proper timeouts for admin API routes

## Stripe Webhook Setup

### For Production:
1. Go to your Stripe dashboard
2. Navigate to Webhooks
3. Create a new webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to Vercel as `STRIPE_WEBHOOK_SECRET_PROD`

### For Development:
Use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Deployment Steps

1. **Connect to Vercel**
   ```bash
   npx vercel --prod
   ```

2. **Set Environment Variables**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all the required variables listed above

3. **Configure Database**
   ```bash
   # Deploy and run migrations
   npx vercel --prod
   ```

4. **Set up Stripe Products** (after first deployment)
   ```bash
   # Run this script to create Stripe products
   node scripts/setup-stripe-products.ts
   ```

5. **Create Admin User** (optional)
   ```bash
   # Run this to make a user admin
   node scripts/make-admin.js your-email@domain.com
   ```

## Post-Deployment Checklist

- [ ] Database connection working
- [ ] Stripe webhooks receiving events
- [ ] Email notifications working
- [ ] Admin panel accessible
- [ ] PDF operations functioning
- [ ] Analytics tracking (if enabled)

## Troubleshooting

### Build Errors
- TypeScript and ESLint errors are ignored during build
- Prisma client is automatically generated
- Check Vercel function logs for runtime errors

### Database Issues
- Ensure `DATABASE_URL` and `DIRECT_URL` are correctly set
- Run `npx prisma db push` to sync schema changes

### Webhook Issues
- Verify webhook endpoint URL is correct
- Check that `STRIPE_WEBHOOK_SECRET_PROD` matches Stripe dashboard
- Test webhooks using Stripe CLI

## Performance Notes

- Admin API routes have 30-second timeout limits
- All admin routes use dynamic rendering
- Database queries are optimized for production
- Large file uploads are handled via serverless functions

## Security Considerations

- All environment variables are properly secured
- Webhook signatures are verified
- Admin routes require authentication
- Database queries use parameterized statements
