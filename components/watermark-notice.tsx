import { AlertTriangle, Crown, Info, Clock, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useOneTimePayment } from "@/hooks/use-one-time-payment"
import { usePathname } from "next/navigation"

interface WatermarkNoticeProps {
  isPaidUser: boolean
  className?: string
}

export function WatermarkNotice({ isPaidUser, className = "" }: WatermarkNoticeProps) {
  const { hasOneTimeAccess, creditsRemaining } = useOneTimePayment()
  const pathname = usePathname()

  if (isPaidUser || hasOneTimeAccess) {
    return null
  }

  const handleOneTimePayment = () => {
    window.location.href = `/api/stripe/one-time-checkout?returnTo=${encodeURIComponent(pathname)}`
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <AlertDescription className="text-amber-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <strong>Free Plan Notice:</strong> Generated PDFs will include a watermark at the bottom of each page.
            <br />
            <span className="text-sm">Remove watermarks with a subscription or one-time payment (single use).</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 sm:flex-shrink-0">
            <Button size="sm" variant="outline" onClick={handleOneTimePayment} className="border-amber-300 text-amber-700 hover:bg-amber-100 w-full sm:w-auto whitespace-nowrap">
              <Zap className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Remove Once ($2.49)</span>
              <span className="sm:hidden">$2.49</span>
            </Button>
            <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
              <a href="/pricing" className="flex items-center justify-center">
                <Crown className="mr-2 h-4 w-4 flex-shrink-0" />
                Upgrade
              </a>
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface OneTimeAccessStatusProps {
  className?: string
}

export function OneTimeAccessStatus({ className = "" }: OneTimeAccessStatusProps) {
  const { hasOneTimeAccess, creditsRemaining } = useOneTimePayment()

  if (!hasOneTimeAccess) {
    return null
  }

  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
      <AlertDescription className="text-green-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <strong>Watermark-Free Credit Active:</strong> You have one watermark-free processing available. 
            <span className="font-medium"> This credit will be consumed after your next tool use.</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface SubscriptionStatusProps {
  isPaidUser: boolean
  plan: string
  className?: string
}

export function SubscriptionStatus({ isPaidUser, plan, className = "" }: SubscriptionStatusProps) {
  if (!isPaidUser) {
    return null
  }

  const planDetails = {
    monthly: { name: "Monthly Pro", color: "text-purple-600" },
    yearly: { name: "Yearly Pro", color: "text-green-600" }
  }

  const details = planDetails[plan as keyof typeof planDetails] || { name: "Pro", color: "text-blue-600" }

  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <Crown className="h-4 w-4 text-green-600 flex-shrink-0" />
      <AlertDescription className={`text-green-800 ${details.color}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <strong>{details.name} Member:</strong> No watermarks will be added to your PDFs. Enjoy unlimited processing!
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
