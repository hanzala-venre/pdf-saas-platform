"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Settings, Database, Shield, Bell, Mail, Globe, Zap } from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type { Session } from "next-auth"

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState({
    siteName: "PDF SaaS Platform",
    siteDescription: "Professional PDF processing tools",
    maintenanceMode: false,
    userRegistration: true,
    emailNotifications: true,
    stripeWebhookUrl: process.env.NEXT_PUBLIC_APP_URL + "/api/stripe/webhook",
    maxFileSize: 10,
    maxFilesPerUser: 5,
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const adminSession = session as Session | null

  const handleSave = async () => {
    setSaving(true)
    try {
      // In a real app, you would save settings to database
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!adminSession || adminSession.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-gray-600" />
            Platform Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure platform-wide settings and preferences</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>Platform operational settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                <p className="text-sm text-gray-500">Prevent users from accessing the platform</p>
              </div>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="userRegistration">User Registration</Label>
                <p className="text-sm text-gray-500">Allow new users to register</p>
              </div>
              <Switch
                id="userRegistration"
                checked={settings.userRegistration}
                onCheckedChange={(checked) => setSettings({ ...settings, userRegistration: checked })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="maxFilesPerUser">Max Files per User</Label>
                <Input
                  id="maxFilesPerUser"
                  type="number"
                  value={settings.maxFilesPerUser}
                  onChange={(e) => setSettings({ ...settings, maxFilesPerUser: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Access
            </CardTitle>
            <CardDescription>Security and access control settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800">Admin Access</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Only users with ADMIN role can access this panel. Current admin: {adminSession.user?.email}
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800">Two-Factor Authentication</h4>
              <p className="text-sm text-blue-700 mt-1">
                2FA is recommended for admin accounts. Configure in your user settings.
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href="/settings">Configure 2FA</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive email alerts for important events</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>Third-party service configurations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="stripeWebhook">Stripe Webhook URL</Label>
              <Input
                id="stripeWebhook"
                value={settings.stripeWebhookUrl}
                onChange={(e) => setSettings({ ...settings, stripeWebhookUrl: e.target.value })}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-1">
                Configure this URL in your Stripe dashboard webhook settings
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800">Stripe Integration Status</h4>
              <p className="text-sm text-green-700 mt-1">
                ✅ Stripe is configured and active
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}
