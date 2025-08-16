"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Download, RefreshCw, Trash2, FileType } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

// Local storage keys
const STORAGE_KEYS = {
  UPLOADED_FILE: 'pdf_to_word_uploaded_file',
  CONVERSION_RESULT: 'pdf_to_word_result'
}

export default function PDFToWordPage() {
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

  const convertToWord = async () => {
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
    trackPDFOperation("pdf_to_word_started", 1)

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
      formData.append("file", file)
      const response = await apiClient.post("/api/pdf/pdf-to-word", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to convert PDF to Word")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)

      trackPDFOperation("pdf_to_word_completed", 1)
      toast({
        title: "Success!",
        description: "Your PDF has been converted to Word document successfully.",
      })
    } catch (error) {
      console.error("Error converting PDF to Word:", error)
      trackPDFOperation("pdf_to_word_failed", 1)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert PDF to Word. Please try again.",
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileType className="h-8 w-8 text-blue-600" />
            PDF to Word
          </h1>
          <p className="text-gray-600 mt-1">Convert your PDF documents to editable Word (.docx) format</p>
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
                  Select the PDF file you want to convert to Word document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the PDF file here...</p>
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
                      <FileText className="h-8 w-8 text-red-600" />
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

            {/* Conversion Info */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Details</CardTitle>
                  <CardDescription>
                    Information about the PDF to Word conversion process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">What will be converted?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Text content and formatting</li>
                          <li>• Images and graphics</li>
                          <li>• Tables and lists</li>
                          <li>• Basic layout structure</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <h4 className="font-medium text-amber-900 mb-2">Please note:</h4>
                        <ul className="text-sm text-amber-800 space-y-1">
                          <li>• Complex layouts may need adjustment</li>
                          <li>• Scanned PDFs may have limited accuracy</li>
                          <li>• Some formatting may be simplified</li>
                          <li>• Results may vary by PDF complexity</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button onClick={convertToWord} disabled={!file || isProcessing} className="flex-1">
                        {isProcessing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Converting to Word...
                          </>
                        ) : (
                          <>
                            <FileType className="mr-2 h-4 w-4" />
                            Convert to Word Document
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
                      <span>Converting PDF to Word document...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <p className="text-xs text-gray-500 mt-2">
                      This may take a few moments depending on the size and complexity of your PDF.
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
              <CardDescription>Your PDF has been converted to Word document format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a href={downloadUrl} download="converted-document.docx">
                    <Download className="mr-2 h-4 w-4" />
                    Download Word Document
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Convert Another PDF
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your PDF has been converted to Word (.docx) format successfully. 
                  You can now edit the document in Microsoft Word or any compatible word processor.
                  {!hasWatermarkFreeAccess && (
                    <span className="block mt-1">
                      As a free user, a watermark has been added to the document.
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Tips for using your Word document:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Review and adjust formatting as needed</li>
                  <li>• Check that all content was converted correctly</li>
                  <li>• Use Word's spell check and grammar tools</li>
                  <li>• Save your document in your preferred format</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
