"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const checkEnvironment = () => {
    const envStatus = {
      NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL || "Not set (client-side check)",
      hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      hasGitHubId: !!process.env.NEXT_PUBLIC_GITHUB_ID,
      currentUrl: window.location.origin,
      userAgent: navigator.userAgent,
    }
    setDebugInfo(envStatus)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>OAuth Authentication Debug</CardTitle>
          <CardDescription>
            Use this page to debug OAuth authentication issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Button onClick={checkEnvironment} className="w-full">
              Check Environment Variables
            </Button>
            
            {debugInfo && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Environment Status:</h3>
                <pre className="text-sm">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">Required OAuth Callback URLs:</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Google:</strong> http://localhost:3000/api/auth/callback/google</div>
                <div><strong>GitHub:</strong> http://localhost:3000/api/auth/callback/github</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">Test Authentication:</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button asChild variant="outline">
                  <Link href="/api/auth/signin/google">Test Google OAuth</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/api/auth/signin/github">Test GitHub OAuth</Link>
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button asChild className="w-full">
                <Link href="/auth/signin">Back to Sign In</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
