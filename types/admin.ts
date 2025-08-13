export interface AdminStats {
  totalUsers: number
  newUsersThisMonth: number
  newUsersThisWeek: number
  totalOperations: number
  operationsThisMonth: number
  operationsThisWeek: number
  activeSubscriptions: number
  subscriptionGrowth: number
  monthlyRevenue: number
  revenueGrowth: number
  totalRevenue: number
  averageRevenuePerUser: number
  churnRate: number
  conversionRate: number
}

export interface RecentUser {
  id: string
  name: string | null
  email: string
  subscription: string
  subscriptionStatus: string
  stripeCustomerId: string | null
  createdAt: string
  _count: {
    pdfOperations: number
  }
}

export interface RecentOperation {
  id: string
  type: string
  fileName: string
  status: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

export interface StripePayment {
  id: string
  amount: number
  currency: string
  status: string
  customerId: string
  customerEmail: string
  customerName: string | null
  description: string
  created: number
  subscriptionId?: string
  planName?: string
  interval?: string
}

export interface StripeSubscription {
  id: string
  customerId: string
  customerEmail: string
  customerName: string | null
  status: string
  planName: string
  planAmount: number
  interval: string
  currentPeriodStart: number
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  created: number
}

export interface RevenueData {
  date: string
  amount: number
  subscriptions: number
  oneTimePayments: number
}

export interface UserAnalytics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  userGrowthData: Array<{
    date: string
    users: number
    newUsers: number
  }>
  subscriptionDistribution: Array<{
    plan: string
    count: number
    percentage: number
  }>
  geographicDistribution: Array<{
    country: string
    users: number
  }>
}

export interface OperationAnalytics {
  totalOperations: number
  operationsToday: number
  operationsThisWeek: number
  operationsThisMonth: number
  operationsByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  operationsOverTime: Array<{
    date: string
    operations: number
    successRate: number
  }>
  averageProcessingTime: number
  successRate: number
}

export interface DashboardMetrics {
  stats: AdminStats
  recentUsers: RecentUser[]
  recentOperations: RecentOperation[]
  recentPayments: StripePayment[]
  revenueData: RevenueData[]
  userAnalytics: UserAnalytics
  operationAnalytics: OperationAnalytics
}
