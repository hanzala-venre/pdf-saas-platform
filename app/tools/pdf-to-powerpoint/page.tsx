"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Upload, Presentation, Download, RefreshCw, Trash2, Monitor } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

type ConversionMode = "one-per-slide" | "content-aware" | "preserve-layout"

// Local storage keys
const STORAGE_KEYS = {
  UPLOADED_FILE: 'pdf_to_powerpoint_uploaded_file',
  CONVERSION_MODE: 'pdf_to_powerpoint_conversion_mode',
  CONVERSION_RESULT: 'pdf_to_powerpoint_result'
}

export default function PDFToPowerPointPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<{ pages: number; size: string } | null>(null)
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
  const [conversionMode, setConversionMode] = usePDFStorage(STORAGE_KEYS.CONVERSION_MODE, "one-per-slide")
  const [, , clearStoredFile] = usePDFStorage(STORAGE_KEYS.UPLOADED_FILE, null)

  // Load from localStorage on component mount
  useEffect(() => {
    clearStoredFile()
  }, [clearStoredFile])

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
      setDownloadUrl(null)
      setFileInfo(null)
      trackPDFOperation("file_uploaded", 1)

      // Get basic file info
      try {
        const formData = new FormData()
        formData.append("file", uploadedFile)

        const response = await fetch("/api/pdf/analyze", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          setFileInfo({
            pages: data.totalPages,
            size: PDFStorageUtils.formatFileSize(uploadedFile.size)
          })
        }
      } catch (error) {
        // Continue without file info if analysis fails
        setFileInfo({
          pages: 0,
          size: PDFStorageUtils.formatFileSize(uploadedFile.size)
        })
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

  const convertToPowerPoint = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file to convert.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("pdf_to_powerpoint_started", 1)

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
      }, 500)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("conversionMode", conversionMode)
      const response = await apiClient.post("/api/pdf/pdf-to-powerpoint", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to convert PDF to PowerPoint")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)

      trackPDFOperation("pdf_to_powerpoint_completed", 1)
      toast({
        title: "Success!",
        description: "Your PDF has been converted to PowerPoint presentation successfully.",
      })
    } catch (error) {
      console.error("Error converting PDF to PowerPoint:", error)
      trackPDFOperation("pdf_to_powerpoint_failed", 1)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert PDF to PowerPoint. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    setFile(null)
    setFileInfo(null)
    setDownloadUrl(null)
    setProgress(0)
    setIsProcessing(false)
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.UPLOADED_FILE)
    localStorage.removeItem(STORAGE_KEYS.CONVERSION_RESULT)
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl && downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  const getConversionModeDescription = (mode: ConversionMode) => {
    switch (mode) {
      case "one-per-slide":
        return "Each PDF page becomes one PowerPoint slide"
      case "content-aware":
        return "Smart splitting based on content structure and headings"
      case "preserve-layout":
        return "Maintain original layout and formatting as much as possible"
      default:
        return ""
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8 text-orange-600" />
            PDF to PowerPoint
          </h1>
          <p className="text-gray-600 mt-1">Convert your PDF documents to PowerPoint (.pptx) presentations</p>
        </div>

        <WatermarkNotice />

        {/* Subscription Status */}
        {!subscriptionLoading && subscription && (
          <>
            <SubscriptionStatus />
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
                  Select the PDF file you want to convert to PowerPoint presentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-orange-600">Drop the PDF file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop a PDF file here, or click to select</p>
                      <p className="text-sm text-gray-500">Only PDF files are supported</p>
                    </div>
                  )}
                </div>

                {file && fileInfo && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Presentation className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {fileInfo.size}
                          {fileInfo.pages > 0 && ` • ${fileInfo.pages} pages`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversion Options */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Options</CardTitle>
                  <CardDescription>
                    Choose how you want to convert your PDF to PowerPoint
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={conversionMode} onValueChange={setConversionMode} className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="one-per-slide" id="one-per-slide" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="one-per-slide" className="font-medium cursor-pointer">
                          One Page per Slide
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          {getConversionModeDescription("one-per-slide")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="content-aware" id="content-aware" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="content-aware" className="font-medium cursor-pointer">
                          Smart Content Splitting
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          {getConversionModeDescription("content-aware")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="preserve-layout" id="preserve-layout" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="preserve-layout" className="font-medium cursor-pointer">
                          Preserve Layout
                        </Label>
                        <p className="text-sm text-gray-500 mt-1">
                          {getConversionModeDescription("preserve-layout")}
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Conversion Info */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Details</CardTitle>
                  <CardDescription>
                    Information about the PDF to PowerPoint conversion process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h4 className="font-medium text-orange-900 mb-2">What will be converted?</h4>
                        <ul className="text-sm text-orange-800 space-y-1">
                          <li>• Text content and formatting</li>
                          <li>• Images and graphics</li>
                          <li>• Slide layouts and structure</li>
                          <li>• Basic styling and colors</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <h4 className="font-medium text-amber-900 mb-2">Please note:</h4>
                        <ul className="text-sm text-amber-800 space-y-1">
                          <li>• Complex layouts may need adjustment</li>
                          <li>• Animations and transitions won't be preserved</li>
                          <li>• Some formatting may be simplified</li>
                          <li>• Best results with presentation-style PDFs</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={convertToPowerPoint} disabled={!file || isProcessing} className="flex-1">
                        {isProcessing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Converting to PowerPoint...
                          </>
                        ) : (
                          <>
                            <Monitor className="mr-2 h-4 w-4" />
                            Convert to PowerPoint
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={resetTool}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </div>
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
                      <span>Converting PDF to PowerPoint presentation...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-gray-500 mt-2">
                      Analyzing content and creating slides. This may take a few moments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Download Result */
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ PDF Converted Successfully!</CardTitle>
              <CardDescription>Your PDF has been converted to PowerPoint presentation format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a href={downloadUrl} download="converted-presentation.pptx">
                    <Download className="mr-2 h-4 w-4" />
                    Download PowerPoint Presentation
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Convert Another PDF
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your PDF has been converted to PowerPoint (.pptx) format successfully. 
                  You can now edit the presentation in Microsoft PowerPoint or any compatible application.
                  {!hasWatermarkFreeAccess && (
                    <span className="block mt-1">
                      As a free user, a watermark has been added to the presentation.
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Tips for using your PowerPoint file:</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Review and adjust slide layouts as needed</li>
                  <li>• Add animations and transitions for better presentation</li>
                  <li>• Use PowerPoint's design tools to enhance visuals</li>
                  <li>• Practice your presentation with speaker notes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
