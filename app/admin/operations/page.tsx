"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Activity, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Upload,
  Scissors,
  FileImage
} from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { Session } from "next-auth"

interface Operation {
  id: string
  type: string
  fileName: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface OperationsStats {
  total: number
  completed: number
  failed: number
  processing: number
  byType: Record<string, number>
  successRate: number
}

const getOperationIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'merge':
      return FileText
    case 'split':
      return Scissors
    case 'compress':
      return Download
    case 'convert':
      return FileImage
    case 'pdf-to-word':
    case 'pdf-to-excel':
    case 'pdf-to-powerpoint':
      return Upload
    default:
      return FileText
  }
}

const getOperationTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'merge': 'Merge PDF',
    'split': 'Split PDF',
    'compress': 'Compress PDF',
    'convert': 'Convert PDF',
    'pdf-to-word': 'PDF to Word',
    'pdf-to-excel': 'PDF to Excel',
    'pdf-to-powerpoint': 'PDF to PowerPoint',
    'pdf-to-image': 'PDF to Image',
    'image-to-pdf': 'Image to PDF',
  }
  return labels[type] || type
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    case 'FAILED':
      return 'bg-red-100 text-red-800'
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return CheckCircle
    case 'FAILED':
      return XCircle
    case 'PROCESSING':
      return RefreshCw
    default:
      return Clock
  }
}

export default function AdminOperationsPage() {
  const { data: session, status } = useSession()
  const [operations, setOperations] = useState<Operation[]>([])
  const [stats, setStats] = useState<OperationsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Type-safe session casting
  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchOperationsData()
    }
  }, [adminSession])

  const fetchOperationsData = async () => {
    setRefreshing(true)
    
    try {
      // Fetch operations statistics
      const statsResponse = await fetch("/api/admin/operations/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch recent operations
      const operationsResponse = await fetch("/api/admin/operations")
      if (operationsResponse.ok) {
        const operationsData = await operationsResponse.json()
        setOperations(operationsData)
      }
    } catch (error) {
      console.error("Error fetching operations data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch operations data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchOperationsData()
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Operations</h1>
            <p className="text-gray-600 mt-1">Monitor PDF operations and system performance</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Operations Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">All time operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Operation success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">Failed operations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Operations by Type */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Operations by Type</CardTitle>
              <CardDescription>Breakdown of operations by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.byType).map(([type, count]) => {
                  const Icon = getOperationIcon(type)
                  return (
                    <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium">{getOperationTypeLabel(type)}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Operations</CardTitle>
            <CardDescription>Latest PDF operations performed by users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {operations.length > 0 ? (
                operations.map((operation) => {
                  const StatusIcon = getStatusIcon(operation.status)
                  const OperationIcon = getOperationIcon(operation.type)
                  
                  return (
                    <div key={operation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <OperationIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="font-medium">{operation.fileName}</div>
                          <div className="text-sm text-gray-600">
                            {getOperationTypeLabel(operation.type)}
                            {operation.user && ` • ${operation.user.name || operation.user.email}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(operation.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {operation.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(operation.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No operations found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
