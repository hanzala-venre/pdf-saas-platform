"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Send, 
  Settings, 
  User, 
  CreditCard,
  TrendingUp,
  Loader2
} from "lucide-react"
import type { Session } from "next-auth"

interface EmailConfig {
  connected: boolean
  config: {
    host: string
    port: string
    user: string
    adminEmail: string
  }
}

export default function AdminEmailPage() {
  const { data: session, status } = useSession()
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testData, setTestData] = useState({
    userName: "John Doe",
    userEmail: "",
    planName: "PRO",
    amount: "2999",
    currency: "usd",
    oldPlan: "FREE",
    newPlan: "PRO"
  })
  const { toast } = useToast()

  // Type-safe session casting
  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchEmailConfig()
      // Set user email as default test email
      if (adminSession.user.email) {
        setTestData(prev => ({ ...prev, userEmail: adminSession.user.email || "" }))
      }
    }
  }, [adminSession])

  const fetchEmailConfig = async () => {
    try {
      const response = await fetch("/api/admin/email-test")
      if (response.ok) {
        const config = await response.json()
        setEmailConfig(config)
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error)
    } finally {
      setLoading(false)
    }
  }

  const testEmailConnection = async () => {
    setTestLoading(true)
    try {
      const response = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "connection" })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Connection Test",
          description: result.message,
          variant: result.connected ? "default" : "destructive",
        })
        await fetchEmailConfig() // Refresh config
      } else {
        toast({
          title: "Connection Test Failed",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test email connection",
        variant: "destructive",
      })
    } finally {
      setTestLoading(false)
    }
  }

  const sendTestEmail = async (type: "payment" | "upgrade" | "cancellation" | "planchange") => {
    setTestLoading(true)
    try {
      const payload = {
        type,
        data: {
          ...testData,
          amount: parseInt(testData.amount) // Convert to number
        }
      }

      const response = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Test Email Sent",
          description: result.message,
        })
      } else {
        toast({
          title: "Failed to Send Test Email",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setTestLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!adminSession || adminSession.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Email System</h1>
          <p className="text-gray-600 mt-1">Manage and test email notifications</p>
        </div>

        {/* Email Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>Current email server configuration and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">Connection Status:</span>
                {emailConfig?.connected ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
                <Button
                  onClick={testEmailConnection}
                  disabled={testLoading}
                  variant="outline"
                  size="sm"
                >
                  {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
              </div>

              {emailConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <Label className="text-sm font-medium">SMTP Host</Label>
                    <p className="text-sm text-gray-600">{emailConfig.config.host}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">SMTP Port</Label>
                    <p className="text-sm text-gray-600">{emailConfig.config.port}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">SMTP User</Label>
                    <p className="text-sm text-gray-600">{emailConfig.config.user}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Admin Email</Label>
                    <p className="text-sm text-gray-600">{emailConfig.config.adminEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Email Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Email Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Test Payment Email
              </CardTitle>
              <CardDescription>Send test payment confirmation emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="userName">User Name</Label>
                  <Input
                    id="userName"
                    value={testData.userName}
                    onChange={(e) => setTestData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="userEmail">User Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={testData.userEmail}
                    onChange={(e) => setTestData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="planName">Plan Name</Label>
                    <Select
                      value={testData.planName}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, planName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                        <SelectItem value="YEARLY">YEARLY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (cents)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={testData.amount}
                      onChange={(e) => setTestData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="2999"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => sendTestEmail("payment")}
                disabled={testLoading || !emailConfig?.connected}
                className="w-full"
              >
                {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Payment Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Upgrade Email Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Test Upgrade Email
              </CardTitle>
              <CardDescription>Send test plan upgrade emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="upgradeUserName">User Name</Label>
                  <Input
                    id="upgradeUserName"
                    value={testData.userName}
                    onChange={(e) => setTestData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="upgradeUserEmail">User Email</Label>
                  <Input
                    id="upgradeUserEmail"
                    type="email"
                    value={testData.userEmail}
                    onChange={(e) => setTestData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="oldPlan">Old Plan</Label>
                    <Select
                      value={testData.oldPlan}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, oldPlan: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">FREE</SelectItem>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newPlan">New Plan</Label>
                    <Select
                      value={testData.newPlan}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, newPlan: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => sendTestEmail("upgrade")}
                disabled={testLoading || !emailConfig?.connected}
                className="w-full"
              >
                {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Upgrade Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Cancellation Email Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Test Cancellation Email
              </CardTitle>
              <CardDescription>Send test subscription cancellation emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cancelUserEmail">User Email</Label>
                  <Input
                    id="cancelUserEmail"
                    type="email"
                    value={testData.userEmail}
                    onChange={(e) => setTestData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cancelPlan">Canceled Plan</Label>
                    <Select
                      value={testData.planName}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, planName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="accessEnd">Access End (days from now)</Label>
                    <Input
                      id="accessEnd"
                      type="number"
                      defaultValue="30"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => sendTestEmail("cancellation")}
                disabled={testLoading || !emailConfig?.connected}
                className="w-full"
              >
                {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Cancellation Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Plan Change Email Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Test Plan Change Email
              </CardTitle>
              <CardDescription>Send test plan change notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="changeUserEmail">User Email</Label>
                  <Input
                    id="changeUserEmail"
                    type="email"
                    value={testData.userEmail}
                    onChange={(e) => setTestData(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromPlan">From Plan</Label>
                    <Select
                      value={testData.oldPlan}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, oldPlan: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="toPlan">To Plan</Label>
                    <Select
                      value={testData.newPlan}
                      onValueChange={(value) => setTestData(prev => ({ ...prev, newPlan: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="BASIC">BASIC</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => sendTestEmail("planchange")}
                disabled={testLoading || !emailConfig?.connected}
                className="w-full"
              >
                {testLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Plan Change Test Email
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Email Templates Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <CardDescription>Automated email notifications configured for your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">User Notifications</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Payment confirmation emails</li>
                  <li>• Plan upgrade confirmations</li>
                  <li>• Plan change notifications</li>
                  <li>• Subscription cancellation confirmations</li>
                  <li>• Subscription renewal notices</li>
                  <li>• Professional styling with company branding</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Admin Notifications</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• New payment alerts</li>
                  <li>• Plan upgrade notifications</li>
                  <li>• Plan change alerts</li>
                  <li>• Subscription cancellation notices</li>
                  <li>• Subscription status changes</li>
                  <li>• Detailed transaction information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
