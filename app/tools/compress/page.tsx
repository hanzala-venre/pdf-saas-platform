"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, FileText, Download, Zap, RefreshCw, Trash2, Info } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

type CompressionQuality = "high" | "medium" | "low" | "maximum"

interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  data: string
  filename: string
}

// Local storage keys
const STORAGE_KEYS = {
  COMPRESSION_QUALITY: 'pdf_compression_quality',
  COMPRESSION_RESULT: 'pdf_compression_result'
}

const qualityOptions = [
  {
    value: "high" as CompressionQuality,
    label: "High Quality",
    description: "Maintains excellent quality with moderate compression",
    reduction: "15-35%",
    color: "bg-green-100 text-green-800"
  },
  {
    value: "medium" as CompressionQuality,
    label: "Medium Quality",
    description: "Balanced quality and file size reduction",
    reduction: "35-55%",
    color: "bg-blue-100 text-blue-800"
  },
  {
    value: "low" as CompressionQuality,
    label: "Low Quality",
    description: "Significant size reduction with acceptable quality",
    reduction: "55-75%",
    color: "bg-orange-100 text-orange-800"
  },
  {
    value: "maximum" as CompressionQuality,
    label: "Maximum Compression",
    description: "Aggressive compression for minimum file size",
    reduction: "75-90%",
    color: "bg-red-100 text-red-800"
  }
]

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const { trackPDFOperation } = useAnalytics()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const toolAccess = usePDFToolAccess()
  
  const { 
    hasOneTimeAccess, 
    hasWatermarkFreeAccess, 
    creditsRemaining, 
    apiClient 
  } = toolAccess  // Use custom hooks for local storage
  const [compressionQuality, setCompressionQuality] = usePDFStorage(STORAGE_KEYS.COMPRESSION_QUALITY, "medium")
  const [compressionResult, setCompressionResult] = usePDFStorage(STORAGE_KEYS.COMPRESSION_RESULT, null)

  // Create blob URL for compressed file
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    if (compressionResult && !downloadUrl) {
      const url = PDFStorageUtils.createBlobFromBase64(compressionResult.data, compressionResult.filename)
      setDownloadUrl(url)
    }
  }, [compressionResult, downloadUrl])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl && downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const pdfFile = acceptedFiles.find((file) => PDFStorageUtils.validatePDFFile(file))

      if (!pdfFile) {
        toast({
          title: "Invalid file",
          description: "Please upload a valid PDF file.",
          variant: "destructive",
        })
        return
      }

      if (acceptedFiles.length > 1) {
        toast({
          title: "Multiple files",
          description: "Please upload only one PDF file at a time.",
          variant: "destructive",
        })
      }

      setFile(pdfFile)
      // Clear previous results when new file is uploaded
      setCompressionResult(null)
      setDownloadUrl(null)
      trackPDFOperation("file_uploaded", 1)
    },
    [toast, trackPDFOperation, setCompressionResult],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  })

  const compressPDF = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("compress_started", 1)

    try {
      // Simulate processing with progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 300)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("quality", compressionQuality)

      const response = await apiClient.post("/api/pdf/compress", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to compress PDF")
      }

      const result = await response.json()
      
      if (result.success) {
        const compressionData: CompressionResult = {
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          compressionRatio: result.compressionRatio,
          data: result.data,
          filename: `compressed-${file.name}`
        }
        
        setCompressionResult(compressionData)

        trackPDFOperation("compress_completed", 1)
        toast({
          title: "Success!",
          description: `Your PDF has been compressed by ${result.compressionRatio}%.`,
        })
      } else {
        throw new Error("No compressed data returned")
      }
    } catch (error) {
      console.error("Error compressing PDF:", error)
      trackPDFOperation("compress_failed", 1)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to compress PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    setFile(null)
    setCompressionResult(null)
    setDownloadUrl(null)
    setProgress(0)
    setIsProcessing(false)
    setCompressionQuality("medium")
  }

  const clearResults = () => {
    setCompressionResult(null)
    setDownloadUrl(null)
    toast({
      title: "Results cleared",
      description: "Compression results have been cleared.",
    })
  }

  const selectedQuality = qualityOptions.find(q => q.value === compressionQuality)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-purple-600" />
            Compress PDF
          </h1>
          <p className="text-gray-600 mt-1">Reduce PDF file size while maintaining quality</p>
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

        {!compressionResult ? (
          <>
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload PDF File</CardTitle>
                <CardDescription>Select the PDF file you want to compress</CardDescription>
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
                      <p className="text-sm text-gray-500">Upload one PDF file to compress it</p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{PDFStorageUtils.formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compression Options */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle>Compression Settings</CardTitle>
                  <CardDescription>Choose the compression level that best fits your needs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup 
                    value={compressionQuality} 
                    onValueChange={(value) => setCompressionQuality(value as CompressionQuality)}
                  >
                    {qualityOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={option.value} className="font-medium cursor-pointer">
                              {option.label}
                            </Label>
                            <Badge className={option.color}>
                              {option.reduction} reduction
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>

                  {selectedQuality && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{selectedQuality.label}</strong>: {selectedQuality.description}
                        <br />
                        Expected file size reduction: <strong>{selectedQuality.reduction}</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-4">
                    <Button onClick={compressPDF} disabled={isProcessing} className="flex-1">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Compressing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Compress PDF
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetTool}>
                      Clear
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
                      <span>Compressing PDF...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-gray-500 text-center">
                      Applying {selectedQuality?.label.toLowerCase()} compression...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Download Results */
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ PDF Compressed Successfully!</CardTitle>
              <CardDescription>Your PDF has been optimized and is ready for download</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Compression Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Original Size</p>
                    <p className="text-lg font-semibold">{PDFStorageUtils.formatFileSize(compressionResult.originalSize)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Compressed Size</p>
                    <p className="text-lg font-semibold text-green-600">{PDFStorageUtils.formatFileSize(compressionResult.compressedSize)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Size Reduction</p>
                    <p className="text-lg font-semibold text-blue-600">{compressionResult.compressionRatio}%</p>
                  </div>
                </div>

                {/* Download Button */}
                <div className="flex gap-4">
                  <Button asChild className="flex-1">
                    <a href={downloadUrl || '#'} download={compressionResult.filename}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Compressed PDF
                    </a>
                  </Button>
                  <Button variant="outline" onClick={clearResults}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Results
                  </Button>
                  <Button variant="outline" onClick={resetTool}>
                    Compress Another PDF
                  </Button>
                </div>

                {/* Success Message */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Great!</strong> Your PDF file size has been reduced by {compressionResult.compressionRatio}%. 
                    The compressed file maintains good quality while being much smaller.
                    {!subscriptionLoading && subscription && !subscription.isPaidUser && (
                      <span className="block mt-1">
                        As a free user, a watermark has been added to the footer of each page.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
