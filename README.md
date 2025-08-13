# PDF SaaS Platform

A comprehensive PDF processing platform built with Next.js, offering various PDF manipulation tools including merge, split, compress, and convert operations.

## Features

- **PDF Operations**:
  - Merge multiple PDFs
  - Split PDF pages
  - Compress PDF files
  - Convert PDF to Word, Excel, PowerPoint
  - Convert images to PDF
  - Rearrange PDF pages
  - React-based PDF editor

- **Authentication**:
  - Email/Password authentication using NextAuth.js
  - User registration and login

- **Subscription System**:
  - Integration with Stripe for payments
  - Free and premium tiers
  - Usage tracking

- **Admin Panel**:
  - User management
  - Operation monitoring
  - Analytics dashboard
  - Email notifications

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **UI Components**: Radix UI, shadcn/ui
- **PDF Processing**: Custom API integration

## Prerequisites

- Node.js 18+ or compatible version
- PostgreSQL database (Supabase recommended)
- Stripe account for payments

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hanzala-venre/pdf-saas-platform.git
   cd pdf-saas-platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup**:
   - Copy `.env.example` to `.env`
   - Fill in your environment variables:
     ```env
     # Database
     DATABASE_URL="your-postgresql-url"
     DIRECT_URL="your-direct-postgresql-url"
     
     # NextAuth
     NEXTAUTH_URL=http://localhost:3000
     NEXTAUTH_SECRET=your-secret-key
     
     # Stripe
     STRIPE_SECRET_KEY=your-stripe-secret-key
     STRIPE_MONTHLY_PRICE_ID=your-monthly-price-id
     STRIPE_YEARLY_PRICE_ID=your-yearly-price-id
     
     # Email (SMTP)
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASSWORD=your-app-password
     ```

4. **Database Setup**:
   ```bash
   npx prisma db push
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── tools/             # PDF tool pages
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                  # Utility libraries
├── prisma/               # Database schema and migrations
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── ...
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma db push` - Push database schema
- `npx prisma studio` - Open Prisma Studio

## Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform** (Vercel, Railway, etc.)

3. **Set up environment variables** in your deployment platform

4. **Run database migrations** in production

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -m 'Add some feature'`
5. Push to the branch: `git push origin feature-name`
6. Open a pull request

## License

This project is private and proprietary.

## Support

For support or questions, please contact the development team.
