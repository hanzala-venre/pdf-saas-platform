"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Merge, Split, FileArchiveIcon as Compress, Edit, Users, Shield, Zap, ArrowRight, Check, FileType, Image, ArrowUpDown, Monitor, Table } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { useAnalytics } from "@/hooks/use-analytics"
import { useEffect } from "react"

export default function HomePage() {
  const { trackPageView, trackUserAction } = useAnalytics()

  useEffect(() => {
    trackPageView("home")
  }, [trackPageView])

  const handleGetStartedClick = () => {
    trackUserAction("get_started_click", "hero")
  }

  const handleToolClick = (toolName: string) => {
    trackUserAction("tool_click", toolName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-800">
            🚀 Professional PDF Tools
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Transform Your PDFs
            <br />
            <span className="text-gray-900">Like Never Before</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Merge, split, compress, edit, and convert PDFs with our powerful, secure, and lightning-fast tools. 
            Transform PDFs to Word, Excel, PowerPoint, and more. Advanced PDF editor for professional editing needs. 
            Trusted by professionals worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
              asChild
              onClick={handleGetStartedClick}
            >
              <Link href="/auth/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              No watermarks
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Secure processing
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Lightning fast
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Complete PDF Toolkit</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From basic operations to advanced conversions - everything you need to work with PDFs efficiently and professionally
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("merge")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Merge className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Merge PDFs</CardTitle>
                <CardDescription>Combine multiple PDF files into one document seamlessly</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/merge">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("split")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Split className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Split PDFs</CardTitle>
                <CardDescription>Extract pages or split PDFs into separate documents</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/split">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("compress")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Compress className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Compress PDFs</CardTitle>
                <CardDescription>Reduce file size while maintaining quality</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/compress">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("image-to-pdf")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileType className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Image to PDF</CardTitle>
                <CardDescription>Convert multiple images into a single PDF document</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/image-to-pdf">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("pdf-to-image")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Image className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>PDF to Image</CardTitle>
                <CardDescription>Convert PDF pages into high-quality image files</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/pdf-to-image">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("rearrange")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ArrowUpDown className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Rearrange Pages</CardTitle>
                <CardDescription>Reorder, duplicate, or remove pages from PDFs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/rearrange">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("pdf-to-word")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileType className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>PDF to Word</CardTitle>
                <CardDescription>Convert PDF documents to editable Word format</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/pdf-to-word">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* PDF to Excel removed */}

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("pdf-to-powerpoint")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Monitor className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>PDF to PowerPoint</CardTitle>
                <CardDescription>Convert PDFs to editable presentations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/pdf-to-powerpoint">Try Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleToolClick("react-editor")}>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Edit className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>PDF Editor</CardTitle>
                <CardDescription>Advanced PDF editor with professional tools</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <Link href="/tools/react-editor">Start Editing</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose PDFTools?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for professionals who demand the best in PDF processing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Secure & Private</h3>
              <p className="text-gray-600">
                Your files are processed securely and deleted immediately after processing. We never store or access
                your documents.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Lightning Fast</h3>
              <p className="text-gray-600">
                Advanced algorithms ensure your PDFs are processed quickly, even for large files and complex operations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Trusted by Thousands</h3>
              <p className="text-gray-600">
                Join thousands of professionals who trust PDFTools for their daily PDF processing needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your PDF Workflow?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who trust PDFTools for their PDF processing needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8" asChild>
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 bg-transparent"
              asChild
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
