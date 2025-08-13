"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Merge, 
  Split, 
  FileArchiveIcon as Compress, 
  Edit, 
  FileType, 
  Image, 
  ArrowUpDown, 
  Monitor, 
  Table,
  Star,
  Clock,
  Zap
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { useAnalytics } from "@/hooks/use-analytics"
import { useEffect } from "react"

const tools = [
  {
    name: "Merge PDFs",
    description: "Combine multiple PDF files into one document seamlessly",
    href: "/tools/merge",
    icon: Merge,
    color: "blue",
    category: "Core",
    popular: true
  },
  {
    name: "Split PDFs",
    description: "Extract pages or split PDFs into separate documents",
    href: "/tools/split",
    icon: Split,
    color: "green",
    category: "Core",
    popular: true
  },
  {
    name: "Compress PDFs",
    description: "Reduce file size while maintaining quality",
    href: "/tools/compress",
    icon: Compress,
    color: "purple",
    category: "Core",
    popular: true
  },
  {
    name: "Image to PDF",
    description: "Convert multiple images into a single PDF document",
    href: "/tools/image-to-pdf",
    icon: FileType,
    color: "green",
    category: "Convert",
    popular: false
  },
  {
    name: "PDF to Image",
    description: "Convert PDF pages into high-quality image files",
    href: "/tools/pdf-to-image",
    icon: Image,
    color: "purple",
    category: "Convert",
    popular: false
  },
  {
    name: "Rearrange Pages",
    description: "Reorder, duplicate, or remove pages from PDFs",
    href: "/tools/rearrange",
    icon: ArrowUpDown,
    color: "purple",
    category: "Edit",
    popular: false
  },
  {
    name: "PDF to Word",
    description: "Convert PDF documents to editable Word format",
    href: "/tools/pdf-to-word",
    icon: FileType,
    color: "blue",
    category: "Convert",
    popular: true
  },
  // PDF to Excel removed
  {
    name: "PDF to PowerPoint",
    description: "Convert PDFs to editable presentations",
    href: "/tools/pdf-to-powerpoint",
    icon: Monitor,
    color: "orange",
    category: "Convert",
    popular: false
  },
  {
    name: "PDF Editor",
    description: "Advanced PDF editor with professional tools",
    href: "/tools/react-editor",
    icon: Edit,
    color: "indigo",
    category: "Edit",
    popular: true
  }
]

const categories = ["All", "Core", "Convert", "Edit"]

export default function ToolsPage() {
  const { trackPageView, trackUserAction } = useAnalytics()

  useEffect(() => {
    trackPageView("tools")
  }, [trackPageView])

  const handleToolClick = (toolName: string) => {
    trackUserAction("tool_click", toolName)
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600", 
      purple: "bg-purple-100 text-purple-600",
      orange: "bg-orange-100 text-orange-600",
      indigo: "bg-indigo-100 text-indigo-600"
    }
    return colorMap[color as keyof typeof colorMap] || "bg-gray-100 text-gray-600"
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">QuikPDF</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional PDF tools for all your document processing needs. 
            Fast, secure, and easy to use.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">10+</h3>
              <p className="text-gray-600">Professional Tools</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">&lt; 30s</h3>
              <p className="text-gray-600">Average Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">4.9/5</h3>
              <p className="text-gray-600">User Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Tools Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Card 
                key={tool.name} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => handleToolClick(tool.name.toLowerCase().replace(/\s+/g, '-'))}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(tool.color)}`}>
                      <tool.icon className="h-6 w-6" />
                    </div>
                    {tool.popular && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="text-sm">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="text-xs">
                      {tool.category}
                    </Badge>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href={tool.href}>
                      Try Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">By Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Merge className="h-4 w-4 text-blue-600" />
                  </div>
                  Core Tools
                </CardTitle>
                <CardDescription>
                  Essential PDF operations for everyday use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tools.filter(tool => tool.category === "Core").map(tool => (
                    <div key={tool.name} className="flex items-center justify-between">
                      <span className="text-sm">{tool.name}</span>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={tool.href}>Try</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileType className="h-4 w-4 text-green-600" />
                  </div>
                  Convert Tools
                </CardTitle>
                <CardDescription>
                  Transform PDFs to and from other formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tools.filter(tool => tool.category === "Convert").map(tool => (
                    <div key={tool.name} className="flex items-center justify-between">
                      <span className="text-sm">{tool.name}</span>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={tool.href}>Try</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Edit className="h-4 w-4 text-purple-600" />
                  </div>
                  Edit Tools
                </CardTitle>
                <CardDescription>
                  Advanced editing and manipulation features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tools.filter(tool => tool.category === "Edit").map(tool => (
                    <div key={tool.name} className="flex items-center justify-between">
                      <span className="text-sm">{tool.name}</span>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={tool.href}>Try</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Need More Features?</h3>
            <p className="text-blue-100 mb-6">
              Upgrade to Pro for unlimited processing, priority support, and advanced features.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/pricing">
                View Pricing Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
