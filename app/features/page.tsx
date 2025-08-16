"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Merge, Split, FileArchiveIcon as Compress, Edit, FileType, Image, 
  ArrowUpDown, Monitor, Table, Shield, Zap, Clock, Globe, 
  Lock, Cloud, Download, Layers, Users, CheckCircle
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { useAnalytics } from "@/hooks/use-analytics"
import { useEffect } from "react"

export default function FeaturesPage() {
  const { trackPageView, trackUserAction } = useAnalytics()

  useEffect(() => {
    trackPageView("features")
  }, [trackPageView])

  const handleFeatureClick = (featureName: string) => {
    trackUserAction("feature_click", featureName)
  }

  const coreFeatures = [
    {
      icon: <Merge className="h-8 w-8" />,
      title: "Merge PDFs",
      description: "Combine multiple PDF files into a single document with ease. Preserve formatting and maintain quality.",
      link: "/tools/merge",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: <Split className="h-8 w-8" />,
      title: "Split PDFs", 
      description: "Extract specific pages or split PDFs into multiple documents. Perfect for organizing large files.",
      link: "/tools/split",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: <Compress className="h-8 w-8" />,
      title: "Compress PDFs",
      description: "Reduce file size while maintaining quality. Perfect for sharing and storage optimization.",
      link: "/tools/compress",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: <Edit className="h-8 w-8" />,
      title: "PDF Editor",
      description: "Advanced editing capabilities with our React-based editor. Add text, images, and annotations.",
      link: "/tools/react-editor",
      color: "bg-orange-100 text-orange-600",
    },
    {
      icon: <FileType className="h-8 w-8" />,
      title: "PDF to Word",
      description: "Convert PDFs to editable Word documents while preserving formatting and layout.",
      link: "/tools/pdf-to-word",
      color: "bg-red-100 text-red-600",
    },
    {
      icon: <Table className="h-8 w-8" />,
      title: "PDF to Excel", 
      description: "Extract tables and data from PDFs and convert them to Excel spreadsheets.",
      link: "/tools/pdf-to-excel",
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: <Monitor className="h-8 w-8" />,
      title: "PDF to PowerPoint",
      description: "Transform PDF presentations into editable PowerPoint slides.",
      link: "/tools/pdf-to-powerpoint", 
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      icon: <Image className="h-8 w-8" />,
      title: "PDF to Image",
      description: "Convert PDF pages to high-quality images in various formats (PNG, JPG, etc.).",
      link: "/tools/pdf-to-image",
      color: "bg-pink-100 text-pink-600",
    },
    {
      icon: <FileType className="h-8 w-8" />,
      title: "Image to PDF",
      description: "Convert images to PDF format. Combine multiple images into a single PDF document.",
      link: "/tools/image-to-pdf",
      color: "bg-indigo-100 text-indigo-600",
    },
    {
      icon: <ArrowUpDown className="h-8 w-8" />,
      title: "Rearrange Pages",
      description: "Reorder PDF pages by dragging and dropping. Reorganize your documents effortlessly.",
      link: "/tools/rearrange",
      color: "bg-teal-100 text-teal-600",
    }
  ]

  const platformFeatures = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Processing",
      description: "All files are processed securely and deleted after conversion"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Lightning Fast",
      description: "Optimized processing engines for rapid file conversion"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "24/7 Availability",
      description: "Access your tools anytime, anywhere, on any device"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "No Software Required",
      description: "Everything runs in your browser - no downloads needed"
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Privacy Protected",
      description: "Your files are never stored or shared with third parties"
    },
    {
      icon: <Cloud className="h-6 w-6" />,
      title: "Bulk Processing",
      description: "Handle multiple files simultaneously for increased productivity"
    }
  ]

  const enterpriseFeatures = [
    "API Access for Developers",
    "Custom Branding Options", 
    "Advanced Security Controls",
    "Priority Support",
    "Usage Analytics & Reporting",
    "Team Management",
    "Custom Integrations",
    "SLA Guarantees"
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-800">
            🚀 Powerful Features
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need for 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}PDF Processing
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Comprehensive suite of PDF tools designed for professionals. From basic operations to advanced 
            editing capabilities, we've got you covered.
          </p>
        </div>
      </section>

      {/* Core PDF Tools */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Core PDF Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-0 shadow-sm">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleFeatureClick(feature.title)}
                  >
                    <Link href={feature.link}>
                      Try Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Platform Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {platformFeatures.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Enterprise Features
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Advanced capabilities for teams and organizations requiring enterprise-grade PDF processing solutions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {enterpriseFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/pricing">
                View Enterprise Plans
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your PDFs?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of professionals who trust our platform for their PDF processing needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/signup">
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600" asChild>
              <Link href="/tools">
                Explore Tools
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
