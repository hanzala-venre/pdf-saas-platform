"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Zap, Star } from "lucide-react"
import Link from "next/link"

interface PlanComparisonProps {
  currentPlan?: string
  currentStatus?: string
  showUpgradeOptions?: boolean
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for trying out our tools",
    icon: Star,
    color: "gray",
    features: [
      "Basic PDF operations",
      "5 files per day",
      "Watermarked outputs",
      "Community support"
    ]
  },
  {
    id: "monthly",
    name: "Monthly Pro",
    price: "$1.99",
    period: "/month",
    description: "Great for regular PDF users",
    icon: Crown,
    color: "purple",
    popular: true,
    features: [
      "Unlimited PDF operations",
      "No watermarks",
      "Files up to 100MB",
      "Priority processing",
      "Email support"
    ]
  },
  {
    id: "yearly",
    name: "Yearly Pro",
    price: "$19.99",
    period: "/year",
    description: "Best value for power users",
    icon: Zap,
    color: "green",
    badge: "Save $4/year",
    features: [
      "Everything in Monthly Pro",
      "Files up to 500MB",
      "Batch processing",
      "API access",
      "Priority support"
    ]
  }
]

export function PlanComparison({ currentPlan = "free", currentStatus = "inactive", showUpgradeOptions = true }: PlanComparisonProps) {
  const isCurrentPlan = (planId: string) => {
    return currentPlan === planId && currentStatus === "active"
  }

  const getButtonText = (planId: string) => {
    if (isCurrentPlan(planId)) {
      return "Current Plan"
    }
    if (planId === "free") {
      return "Downgrade to Free"
    }
    return `Upgrade to ${plans.find(p => p.id === planId)?.name}`
  }

  const getButtonVariant = (planId: string) => {
    if (isCurrentPlan(planId)) {
      return "secondary"
    }
    if (planId === "free") {
      return "outline"
    }
    return "default"
  }

  const getCardClassName = (planId: string, color: string) => {
    const baseClass = "relative transition-all duration-200 hover:shadow-lg"
    
    if (isCurrentPlan(planId)) {
      return `${baseClass} ring-2 ring-blue-500 ring-offset-2 shadow-lg`
    }
    
    if (color === "purple") {
      return `${baseClass} border-purple-200 hover:border-purple-300`
    }
    
    if (color === "green") {
      return `${baseClass} border-green-200 hover:border-green-300`
    }
    
    return baseClass
  }

  const handlePlanClick = async (planId: string) => {
    if (planId === "free") {
      try {
        const response = await fetch("/api/billing/cancel", {
          method: "POST",
        })
        
        if (response.ok) {
          window.location.reload() // Refresh to show updated status
        } else {
          console.error("Failed to downgrade to free plan")
        }
      } catch (error) {
        console.error("Error downgrading to free plan:", error)
      }
    }
  }

  const getPlanUrl = (planId: string) => {
    if (planId === "free") {
      return "#" // Will be handled by onClick
    }
    return `/api/stripe/checkout?plan=${planId}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const Icon = plan.icon
        const isCurrent = isCurrentPlan(plan.id)
        
        return (
          <Card key={plan.id} className={getCardClassName(plan.id, plan.color)}>
            {/* Plan Badge */}
            {(plan.popular || plan.badge || isCurrent) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className={
                  isCurrent 
                    ? "bg-blue-600 text-white"
                    : plan.color === "purple" 
                    ? "bg-purple-600 text-white" 
                    : plan.color === "green"
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white"
                }>
                  {isCurrent 
                    ? "Current Plan" 
                    : plan.badge || (plan.popular ? "Most Popular" : "")
                  }
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${
                    plan.color === "purple" ? "text-purple-600" :
                    plan.color === "green" ? "text-green-600" :
                    "text-gray-600"
                  }`} />
                  {plan.name}
                </CardTitle>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-gray-600">{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {showUpgradeOptions && (
                <Button
                  className={`w-full ${
                    plan.color === "purple" 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : plan.color === "green"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }`}
                  variant={getButtonVariant(plan.id)}
                  disabled={isCurrent}
                  asChild={!isCurrent && plan.id !== "free"}
                  onClick={plan.id === "free" && !isCurrent ? () => handlePlanClick("free") : undefined}
                >
                  {isCurrent ? (
                    <span>{getButtonText(plan.id)}</span>
                  ) : plan.id === "free" ? (
                    <span>{getButtonText(plan.id)}</span>
                  ) : (
                    <Link href={getPlanUrl(plan.id)}>
                      {getButtonText(plan.id)}
                    </Link>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
