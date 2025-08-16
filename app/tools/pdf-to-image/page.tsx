"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Download, Image as ImageIcon, RefreshCw, Archive } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { PDFStorageUtils } from "@/hooks/use-pdf-storage"

interface PDFFile {
  file: File
  id: string
  name: string
  size: string
}

// Supported output formats
const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG (Recommended)', description: 'High quality, supports transparency' },
  { value: 'jpeg', label: 'JPEG', description: 'Smaller file size, good for photos' },
  { value: 'webp', label: 'WebP', description: 'Modern format, excellent compression' },
]

export default function PDFToImagePage() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [outputFormat, setOutputFormat] = useState<string>('png')
  const [totalPages, setTotalPages] = useState<number>(0)
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const pdfFiles = acceptedFiles.filter((file) => PDFStorageUtils.validatePDFFile(file))

      if (pdfFiles.length !== acceptedFiles.length) {
        toast({
          title: "Invalid files",
          description: "Please upload only valid PDF files.",
          variant: "destructive",
        })
      }

      if (pdfFiles.length === 0) {
        return
      }

      // Only allow one PDF file for conversion
      if (pdfFiles.length > 1) {
        toast({
          title: "Multiple files detected",
          description: "Please upload only one PDF file at a time for conversion.",
          variant: "destructive",
        })
        return
      }

      const newFiles: PDFFile[] = pdfFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: PDFStorageUtils.formatFileSize(file.size),
      }))

      setFiles(newFiles)
      // Clear previous results when new files are added
      setDownloadUrl(null)
      setTotalPages(0)
      trackPDFOperation("files_added", pdfFiles.length)
    },
    [toast, trackPDFOperation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false, // Only allow single file
  })

  const removeFile = (id: string) => {
    setFiles(files.filter((file) => file.id !== id))
    setDownloadUrl(null) // Clear download URL when files change
    setTotalPages(0)
  }

  const convertToImages = async () => {
    if (files.length === 0) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file to convert.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("pdf_to_image_started", files.length)

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
      }, 300)

      const formData = new FormData()
      formData.append('file', files[0].file)
      formData.append('format', outputFormat)
      const response = await apiClient.post("/api/pdf/pdf-to-image", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to convert PDF to images")
      }

      // Always expect a ZIP file response
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      
      // Get page count from content-disposition header
      const disposition = response.headers.get('content-disposition')
      if (disposition && disposition.includes('pages')) {
        const match = disposition.match(/(\d+)-pages/)
        if (match) {
          setTotalPages(parseInt(match[1]))
        }
      } else {
        setTotalPages(1) // Default to 1 if not specified
      }

      trackPDFOperation("pdf_to_image_completed", files.length)
      toast({
        title: "Success!",
        description: "Your PDF has been converted to images successfully.",
      })
    } catch (error) {
      console.error("Error converting PDF to images:", error)
      trackPDFOperation("pdf_to_image_failed", files.length)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert PDF to images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    setFiles([])
    setDownloadUrl(null)
    setProgress(0)
    setIsProcessing(false)
    setTotalPages(0)
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
            <ImageIcon className="h-8 w-8 text-purple-600" />
            PDF to Image
          </h1>
          <p className="text-gray-600 mt-1">Convert PDF pages into high-quality image files</p>
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
                <CardDescription>Select or drag and drop the PDF file you want to convert to images</CardDescription>
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
                      <p className="text-gray-600 mb-2">Drag and drop a PDF file here, or click to select file</p>
                      <p className="text-sm text-gray-500">Each page will be converted to a separate image</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Output Settings</CardTitle>
                <CardDescription>Choose the image format for your converted pages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image Format</label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTPUT_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div>
                              <div className="font-medium">{format.label}</div>
                              <div className="text-sm text-gray-500">{format.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Info */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{files[0].name}</p>
                        <p className="text-sm text-gray-500">{files[0].size}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => removeFile(files[0].id)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-6">
                    <Button 
                      onClick={convertToImages} 
                      disabled={files.length === 0 || isProcessing} 
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Converting to {outputFormat.toUpperCase()}...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Convert to {outputFormat.toUpperCase()} Images
                        </>
                      )}
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
                      <span>Converting PDF to images...</span>
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
              <CardTitle className="text-green-600">✅ PDF Converted Successfully!</CardTitle>
              <CardDescription>
                Your PDF has been converted to {totalPages} {outputFormat.toUpperCase()} image{totalPages !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a 
                    href={downloadUrl} 
                    download={
                      totalPages === 1 
                        ? `converted-page.${outputFormat}` 
                        : `pdf-to-${outputFormat}-${totalPages}-pages.zip`
                    }
                  >
                    {totalPages === 1 ? (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Image
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Download ZIP ({totalPages} images)
                      </>
                    )}
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Convert Another PDF
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your PDF has been converted successfully. 
                  {totalPages > 1 && ` All ${totalPages} pages have been converted to ${outputFormat.toUpperCase()} format and packaged in a ZIP file.`}
                  {totalPages === 1 && ` The single page has been converted to ${outputFormat.toUpperCase()} format.`}
                  {!hasWatermarkFreeAccess && totalPages > 0 && (
                    <span className="block mt-1">
                      As a free user, a watermark was present in the original PDF and may appear in the converted images.
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
