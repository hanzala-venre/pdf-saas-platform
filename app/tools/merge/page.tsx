"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Download, X, ArrowUp, ArrowDown, Merge, Trash2, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { useOneTimePayment } from "@/hooks/use-one-time-payment"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

interface PDFFile {
  file: File
  id: string
  name: string
  size: string
}

// Local storage keys
const STORAGE_KEYS = {
  MERGE_FILES: 'pdf_merge_files',
  MERGE_ORDER: 'pdf_merge_order'
}

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { trackPDFOperation } = useAnalytics()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { hasOneTimeAccess } = useOneTimePayment()

  const isPaidUser = subscription?.isPaidUser || false
  const hasWatermarkFreeAccess = isPaidUser || hasOneTimeAccess || false

  // Use custom hooks for local storage
  const [, , clearMergeOrder] = usePDFStorage(STORAGE_KEYS.MERGE_ORDER, null)

  // Load files from localStorage on component mount
  useEffect(() => {
    // Note: We can't restore actual File objects from localStorage
    // This would require implementing a more sophisticated storage solution
    // For now, we'll just clear the storage on page load
    clearMergeOrder()
  }, [clearMergeOrder])

  // Save file order to localStorage whenever files change
  useEffect(() => {
    if (files.length > 0) {
      const fileIds = files.map(f => f.id)
      localStorage.setItem(STORAGE_KEYS.MERGE_ORDER, JSON.stringify(fileIds))
    } else {
      localStorage.removeItem(STORAGE_KEYS.MERGE_ORDER)
    }
  }, [files])

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

      const newFiles: PDFFile[] = pdfFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: PDFStorageUtils.formatFileSize(file.size),
      }))

      setFiles((prev) => [...prev, ...newFiles])
      // Clear previous results when new files are added
      setDownloadUrl(null)
      trackPDFOperation("files_added", pdfFiles.length)
    },
    [toast, trackPDFOperation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
  })

  const removeFile = (id: string) => {
    setFiles(files.filter((file) => file.id !== id))
    setDownloadUrl(null) // Clear download URL when files change
  }

  const moveFile = (id: string, direction: "up" | "down") => {
    const index = files.findIndex((file) => file.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === files.length - 1)) {
      return
    }

    const newFiles = [...files]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
    setFiles(newFiles)
    setDownloadUrl(null) // Clear download URL when order changes
  }

  const mergePDFs = async () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please upload at least 2 PDF files to merge.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("merge_started", files.length)

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
      files.forEach((pdfFile, index) => {
        formData.append(`file${index}`, pdfFile.file)
      })
      formData.append('hasWatermarkFreeAccess', hasWatermarkFreeAccess.toString())

      const headers: HeadersInit = {}
      if (hasOneTimeAccess) {
        headers['x-one-time-access'] = 'true'
      }

      const response = await fetch("/api/pdf/merge", {
        method: "POST",
        headers,
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to merge PDFs")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)

      trackPDFOperation("merge_completed", files.length)
      toast({
        title: "Success!",
        description: "Your PDFs have been merged successfully.",
      })
    } catch (error) {
      console.error("Error merging PDFs:", error)
      trackPDFOperation("merge_failed", files.length)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to merge PDFs. Please try again.",
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
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.MERGE_FILES)
    localStorage.removeItem(STORAGE_KEYS.MERGE_ORDER)
  }

  const clearFiles = () => {
    setFiles([])
    setDownloadUrl(null)
    localStorage.removeItem(STORAGE_KEYS.MERGE_FILES)
    localStorage.removeItem(STORAGE_KEYS.MERGE_ORDER)
    toast({
      title: "Files cleared",
      description: "All files have been removed.",
    })
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
            <Merge className="h-8 w-8 text-blue-600" />
            Merge PDFs
          </h1>
          <p className="text-gray-600 mt-1">Combine multiple PDF files into one document</p>
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
                <CardTitle>Upload PDF Files</CardTitle>
                <CardDescription>Select or drag and drop the PDF files you want to merge</CardDescription>
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
                    <p className="text-blue-600">Drop the PDF files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop PDF files here, or click to select files</p>
                      <p className="text-sm text-gray-500">Upload multiple PDF files to merge them into one</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Files to Merge ({files.length})</CardTitle>
                      <CardDescription>
                        Drag files to reorder them. The order here will be the order in the merged PDF.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearFiles}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{file.size}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveFile(file.id, "up")}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveFile(file.id, "down")}
                            disabled={index === files.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => removeFile(file.id)}
                            title="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Button onClick={mergePDFs} disabled={files.length < 2 || isProcessing} className="flex-1">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Merge className="mr-2 h-4 w-4" />
                          Merge {files.length} PDFs
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetTool}>
                      Clear All
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
                      <span>Merging PDFs...</span>
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
              <CardTitle className="text-green-600">✅ PDFs Merged Successfully!</CardTitle>
              <CardDescription>Your {files.length} PDF files have been merged into one document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a href={downloadUrl} download="merged-document.pdf">
                    <Download className="mr-2 h-4 w-4" />
                    Download Merged PDF
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Merge More PDFs
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your merged PDF has been generated successfully. 
                  {files.length > 0 && ` It contains ${files.length} original documents.`}
                  {!subscriptionLoading && subscription && !subscription.isPaidUser && (
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
