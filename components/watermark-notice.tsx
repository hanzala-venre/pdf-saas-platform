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
  const { hasOneTimeAccess, getTimeRemainingFormatted } = useOneTimePayment()
  const pathname = usePathname()

  if (isPaidUser || hasOneTimeAccess) {
    return null
  }

  const handleOneTimePayment = () => {
    window.location.href = `/api/stripe/one-time-checkout?returnTo=${encodeURIComponent(pathname)}`
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Free Plan Notice:</strong> Generated PDFs will include a watermark at the bottom of each page.
            <br />
            <span className="text-sm">Remove watermarks with a subscription or one-time payment.</span>
          </div>
          <div className="ml-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={handleOneTimePayment} className="border-amber-300 text-amber-700 hover:bg-amber-100">
              <Zap className="mr-2 h-4 w-4" />
              Remove Now ($2.49)
            </Button>
            <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700">
              <a href="/pricing">
                <Crown className="mr-2 h-4 w-4" />
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
  const { hasOneTimeAccess, getTimeRemainingFormatted } = useOneTimePayment()

  if (!hasOneTimeAccess) {
    return null
  }

  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <Clock className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <strong>Watermark-Free Access Active:</strong> No watermarks will be added to your PDFs. 
        <span className="font-medium"> Time remaining: {getTimeRemainingFormatted()}</span>
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
      <Crown className="h-4 w-4 text-green-600" />
      <AlertDescription className={`text-green-800 ${details.color}`}>
        <strong>{details.name} Member:</strong> No watermarks will be added to your PDFs. Enjoy unlimited processing!
      </AlertDescription>
    </Alert>
  )
}
