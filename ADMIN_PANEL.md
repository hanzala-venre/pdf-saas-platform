# Admin Panel Documentation

## Overview

The admin panel provides comprehensive platform management capabilities with real-time analytics, user management, payment monitoring, and system administration features.

## Features

### 🏠 Dashboard
- **Real-time Metrics**: Total users, active subscriptions, monthly revenue, PDF operations
- **Growth Analytics**: User acquisition trends, conversion rates, churn analysis
- **Quick Actions**: Direct access to all admin functions
- **Recent Activity**: Latest users, payments, and operations
- **Interactive Charts**: Revenue trends, user growth visualization

### 👥 User Management
- **User Overview**: Complete user listing with subscription status
- **Search & Filter**: Find users by email, name, or subscription type
- **User Actions**: 
  - Delete user accounts
  - Suspend/reactivate accounts
  - View user operation history
- **Export Functionality**: CSV export of user data
- **Bulk Operations**: Mass user management capabilities

### 💳 Payment Management
- **Stripe Integration**: Real-time payment data from Stripe
- **Payment Analytics**: Success rates, failure analysis, revenue tracking
- **Transaction Details**: Complete payment history with customer info
- **Export Options**: CSV export for accounting
- **Payment Status Monitoring**: Track successful, failed, and pending payments

### 🔄 Subscription Management  
- **Active Subscriptions**: Monitor all active subscription plans
- **Cancellation Management**: Cancel subscriptions directly from admin panel
- **MRR Tracking**: Monthly Recurring Revenue calculations
- **Subscription Analytics**: Plan distribution, churn analysis
- **Direct Stripe Links**: Jump to Stripe dashboard for detailed management

### 📊 Advanced Analytics
- **User Analytics**:
  - Daily/weekly/monthly user growth
  - Active user tracking
  - Geographic distribution
  - Subscription plan analytics
- **Operation Analytics**:
  - PDF processing statistics
  - Success rate monitoring
  - Average processing times
  - Operation type breakdown
- **Custom Time Ranges**: 7 days, 30 days, 90 days, 1 year
- **Interactive Charts**: Line charts, pie charts, bar graphs
- **Export Capabilities**: Download analytics data

### 🛠 System Settings
- **Platform Configuration**: Site name, description, maintenance mode
- **Security Settings**: Admin access control, 2FA recommendations
- **File Limits**: Configure max file sizes and user limits
- **Integration Management**: Stripe webhook configuration
- **Notification Settings**: Email alert preferences

## Access Control

### Admin Role Requirement
- Only users with `role: "ADMIN"` can access the admin panel
- Automatic redirection for non-admin users
- Session-based authentication with role verification

### Security Features
- Protected API endpoints with admin role verification
- Type-safe session handling
- Secure Stripe webhook integration
- CSRF protection on all forms

## API Endpoints

### Admin Stats
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/analytics` - Advanced analytics

### User Management
- `GET /api/admin/users` - User listing
- `DELETE /api/admin/users/[id]` - Delete user
- `PUT /api/admin/users/[id]` - Update user

### Stripe Integration
- `GET /api/admin/stripe/payments` - Payment history
- `GET /api/admin/stripe/subscriptions` - Subscription data
- `DELETE /api/admin/stripe/subscriptions` - Cancel subscription

## Real-time Data

### Stripe Webhook Integration
The system uses Stripe webhooks for real-time payment and subscription updates:

- **subscription.created/updated** - Updates user subscription status
- **subscription.deleted** - Resets user to free plan
- **invoice.payment_succeeded** - Updates subscription period
- **invoice.payment_failed** - Marks subscription as past due
- **payment_intent.succeeded** - Logs successful payments

### Webhook Configuration
Add this URL to your Stripe webhook endpoints:
```
https://yourdomain.com/api/stripe/webhook
```

Required events:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`

## Database Schema

### User Model Extensions
```sql
-- Additional fields for subscription management
stripeCustomerId     String?
stripeSubscriptionId String?
subscriptionStatus   String  @default("free")
subscriptionPlan     String  @default("free")
subscriptionCurrentPeriodEnd DateTime?
```

## Monitoring & Analytics

### Key Performance Indicators (KPIs)
- **User Growth**: Daily, weekly, monthly new user registration
- **Revenue Metrics**: MRR, total revenue, ARPU
- **Conversion Rates**: Free to paid conversion tracking
- **Churn Analysis**: Subscription cancellation patterns
- **Operation Success**: PDF processing success rates

### Business Intelligence
- **Cohort Analysis**: User retention over time
- **Revenue Forecasting**: Growth trend predictions
- **User Segmentation**: Behavior-based user groups
- **Performance Monitoring**: System health and uptime

## Deployment Considerations

### Environment Variables
```bash
# Required for admin panel functionality
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Performance Optimization
- **Pagination**: Large datasets are paginated for performance
- **Caching**: Static analytics data cached for faster loading
- **Lazy Loading**: Charts and heavy components loaded on demand
- **Database Indexing**: Optimized queries for admin operations

### Security Best Practices
- **Rate Limiting**: API endpoints protected against abuse
- **Input Validation**: All admin inputs validated and sanitized
- **Audit Logging**: Admin actions logged for compliance
- **Session Management**: Secure session handling with role checks

## Troubleshooting

### Common Issues

1. **Admin Access Denied**
   - Verify user role is set to "ADMIN" in database
   - Check session authentication

2. **Stripe Data Not Loading**
   - Verify STRIPE_SECRET_KEY is correct
   - Check API key permissions in Stripe dashboard

3. **Charts Not Rendering**
   - Ensure recharts is installed
   - Check browser console for JavaScript errors

4. **Webhook Not Working**
   - Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard
   - Check webhook endpoint URL is publicly accessible

## Future Enhancements

### Planned Features
- **Email Campaign Management**: Send notifications to users
- **Advanced Reporting**: Custom report generation
- **API Key Management**: Developer API access control
- **Multi-tenant Support**: Multiple organization management
- **Automated Alerts**: System health monitoring
- **A/B Testing**: Feature flag management

### Integration Roadmap
- **Google Analytics**: Enhanced user behavior tracking
- **Slack Integration**: Admin notifications
- **External APIs**: Third-party service monitoring
- **Database Backups**: Automated backup management
