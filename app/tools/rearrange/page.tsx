"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Download, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, RefreshCw, Shuffle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

interface PageItem {
  id: string
  pageNumber: number
  preview?: string
}

// Local storage keys
const STORAGE_KEYS = {
  UPLOADED_FILE: 'pdf_rearrange_uploaded_file',
  PAGE_ORDER: 'pdf_rearrange_page_order'
}

export default function RearrangePDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { trackPDFOperation } = useAnalytics()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const toolAccess = usePDFToolAccess()
  
  const { 
    hasOneTimeAccess, 
    hasWatermarkFreeAccess, 
    creditsRemaining, 
    apiClient 
  } = toolAccess

  // Use custom hooks for local storage
  const [, , clearPageOrder] = usePDFStorage(STORAGE_KEYS.PAGE_ORDER, null)

  // Load from localStorage on component mount
  useEffect(() => {
    clearPageOrder()
  }, [clearPageOrder])

  // Save page order to localStorage whenever pages change
  useEffect(() => {
    if (pages.length > 0) {
      const pageOrder = pages.map(p => p.pageNumber)
      localStorage.setItem(STORAGE_KEYS.PAGE_ORDER, JSON.stringify(pageOrder))
    } else {
      localStorage.removeItem(STORAGE_KEYS.PAGE_ORDER)
    }
  }, [pages])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      const uploadedFile = acceptedFiles[0]
      if (uploadedFile.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        })
        return
      }

      setFile(uploadedFile)
      setIsAnalyzing(true)
      setDownloadUrl(null)
      trackPDFOperation("file_uploaded", 1)

      try {
        // Analyze PDF to get page count and previews
        const formData = new FormData()
        formData.append("file", uploadedFile)

        const response = await fetch("/api/pdf/rearrange/analyze", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to analyze PDF")
        }

        const data = await response.json()
        setTotalPages(data.totalPages)
        
        // Create page items with initial order
        const pageItems: PageItem[] = Array.from({ length: data.totalPages }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          pageNumber: i + 1,
          preview: data.previews ? data.previews[i] : undefined
        }))
        
        setPages(pageItems)
        toast({
          title: "PDF analyzed",
          description: `Found ${data.totalPages} pages. You can now rearrange them.`,
        })
      } catch (error) {
        console.error("Error analyzing PDF:", error)
        toast({
          title: "Error",
          description: "Failed to analyze PDF. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsAnalyzing(false)
      }
    },
    [toast, trackPDFOperation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  })

  const movePage = (id: string, direction: "up" | "down") => {
    const index = pages.findIndex((page) => page.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === pages.length - 1)) {
      return
    }

    const newPages = [...pages]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]]
    setPages(newPages)
    setDownloadUrl(null) // Clear download URL when order changes
  }

  const removePage = (id: string) => {
    setPages(pages.filter((page) => page.id !== id))
    setDownloadUrl(null)
  }

  const duplicatePage = (id: string) => {
    const pageIndex = pages.findIndex((page) => page.id === id)
    if (pageIndex === -1) return

    const pageToDuplicate = pages[pageIndex]
    const newPage: PageItem = {
      ...pageToDuplicate,
      id: Math.random().toString(36).substr(2, 9),
    }

    const newPages = [...pages]
    newPages.splice(pageIndex + 1, 0, newPage)
    setPages(newPages)
    setDownloadUrl(null)
  }

  const shufflePages = () => {
    const newPages = [...pages]
    for (let i = newPages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newPages[i], newPages[j]] = [newPages[j], newPages[i]]
    }
    setPages(newPages)
    setDownloadUrl(null)
  }

  const rearrangePDF = async () => {
    if (!file || pages.length === 0) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("pdf_rearrange_started", pages.length)

    try {
      // Simulate processing with progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("pageOrder", JSON.stringify(pages.map(p => p.pageNumber)))
      const response = await apiClient.post("/api/pdf/rearrange", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to rearrange PDF pages")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)

      trackPDFOperation("pdf_rearrange_completed", pages.length)
      toast({
        title: "Success!",
        description: "Your PDF pages have been rearranged successfully.",
      })
    } catch (error) {
      console.error("Error rearranging PDF:", error)
      trackPDFOperation("pdf_rearrange_failed", pages.length)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rearrange PDF pages. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    setFile(null)
    setPages([])
    setTotalPages(0)
    setDownloadUrl(null)
    setProgress(0)
    setIsProcessing(false)
    setIsAnalyzing(false)
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.UPLOADED_FILE)
    localStorage.removeItem(STORAGE_KEYS.PAGE_ORDER)
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl && downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArrowUpDown className="h-8 w-8 text-purple-600" />
            Rearrange PDF Pages
          </h1>
          <p className="text-gray-600 mt-1">Reorder, duplicate, or remove pages from your PDF document</p>
        </div>

        <WatermarkNotice isPaidUser={hasWatermarkFreeAccess} />

        {/* Subscription Status */}
        {!subscriptionLoading && subscription && (
          <>
            <SubscriptionStatus 
              isPaidUser={hasWatermarkFreeAccess} 
              plan={subscription.plan} 
            />
            <OneTimeAccessStatus />
          </>
        )}

        {!downloadUrl ? (
          <>
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload PDF File</CardTitle>
                <CardDescription>
                  Select the PDF file whose pages you want to rearrange
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-purple-600">Drop the PDF file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop a PDF file here, or click to select</p>
                      <p className="text-sm text-gray-500">Only PDF files are supported</p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {PDFStorageUtils.formatFileSize(file.size)}
                          {totalPages > 0 && ` • ${totalPages} pages`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Progress */}
            {isAnalyzing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Analyzing PDF pages...</span>
                    </div>
                    <Progress value={undefined} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Page List */}
            {pages.length > 0 && !isAnalyzing && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>PDF Pages ({pages.length})</CardTitle>
                      <CardDescription>
                        Drag to reorder, or use the controls to manage pages
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={shufflePages}>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Shuffle
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPages([])}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pages.map((page, index) => (
                      <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded border bg-white flex items-center justify-center text-sm font-medium">
                            {page.pageNumber}
                          </div>
                          <div>
                            <p className="font-medium">Page {page.pageNumber}</p>
                            <p className="text-sm text-gray-500">Position: {index + 1}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => movePage(page.id, "up")}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => movePage(page.id, "down")}
                            disabled={index === pages.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicatePage(page.id)}
                            title="Duplicate page"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => removePage(page.id)}
                            title="Remove page"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Button onClick={rearrangePDF} disabled={pages.length === 0 || isProcessing} className="flex-1">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Rearranging...
                        </>
                      ) : (
                        <>
                          <ArrowUpDown className="mr-2 h-4 w-4" />
                          Rearrange PDF ({pages.length} pages)
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetTool}>
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            {isProcessing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rearranging PDF pages...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Download Result */
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ PDF Rearranged Successfully!</CardTitle>
              <CardDescription>Your PDF pages have been rearranged according to your specifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a href={downloadUrl} download="rearranged-pages.pdf">
                    <Download className="mr-2 h-4 w-4" />
                    Download Rearranged PDF
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Rearrange Another PDF
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your PDF has been rearranged successfully. 
                  {pages.length > 0 && ` It now contains ${pages.length} page${pages.length !== 1 ? 's' : ''}.`}
                  {!hasWatermarkFreeAccess && (
                    <span className="block mt-1">
                      As a free user, a watermark has been added to the footer of each page.
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
