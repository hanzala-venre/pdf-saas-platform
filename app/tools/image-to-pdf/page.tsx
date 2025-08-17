"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, Image as ImageIcon, Download, X, ArrowUp, ArrowDown, FileType, Trash2, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

interface ImageFile {
  file: File
  id: string
  name: string
  size: string
  preview: string
  type: string
}

// Local storage keys
const STORAGE_KEYS = {
  IMAGE_FILES: 'pdf_image_to_pdf_files',
  IMAGE_ORDER: 'pdf_image_to_pdf_order'
}

// Supported image types
const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif']
}

export default function ImageToPDFPage() {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
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
  const [, , clearImageOrder] = usePDFStorage(STORAGE_KEYS.IMAGE_ORDER, null)

  // Load files from localStorage on component mount
  useEffect(() => {
    // Note: We can't restore actual File objects from localStorage
    // This would require implementing a more sophisticated storage solution
    // For now, we'll just clear the storage on page load
    clearImageOrder()
  }, [clearImageOrder])

  // Save file order to localStorage whenever files change
  useEffect(() => {
    if (files.length > 0) {
      const fileIds = files.map(f => f.id)
      localStorage.setItem(STORAGE_KEYS.IMAGE_ORDER, JSON.stringify(fileIds))
    } else {
      localStorage.removeItem(STORAGE_KEYS.IMAGE_ORDER)
    }
  }, [files])

  // Validate image file
  const validateImageFile = (file: File): boolean => {
    return Object.keys(SUPPORTED_IMAGE_TYPES).includes(file.type)
  }

  // Format file type for display
  const formatFileType = (type: string): string => {
    return type.split('/')[1].toUpperCase()
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter(validateImageFile)

      if (imageFiles.length !== acceptedFiles.length) {
        toast({
          title: "Invalid files",
          description: "Please upload only valid image files (JPG, PNG, WEBP, GIF, BMP, TIFF).",
          variant: "destructive",
        })
      }

      if (imageFiles.length === 0) {
        return
      }

      const newFiles: ImageFile[] = imageFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: PDFStorageUtils.formatFileSize(file.size),
        preview: URL.createObjectURL(file),
        type: formatFileType(file.type),
      }))

      setFiles((prev) => [...prev, ...newFiles])
      // Clear previous results when new files are added
      setDownloadUrl(null)
      trackPDFOperation("files_added", imageFiles.length)
    },
    [toast, trackPDFOperation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_IMAGE_TYPES,
    multiple: true,
  })

  const removeFile = (id: string) => {
    const fileToRemove = files.find(f => f.id === id)
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
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

  const convertToPDF = async () => {
    if (files.length < 1) {
      toast({
        title: "No files selected",
        description: "Please upload at least 1 image file to convert.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("image_to_pdf_started", files.length)

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
      files.forEach((imageFile, index) => {
        formData.append(`file${index}`, imageFile.file)
      })
      const response = await apiClient.post("/api/pdf/image-to-pdf", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to convert images to PDF")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)

      trackPDFOperation("image_to_pdf_completed", files.length)
      toast({
        title: "Success!",
        description: "Your images have been converted to PDF successfully.",
      })
    } catch (error) {
      console.error("Error converting images to PDF:", error)
      trackPDFOperation("image_to_pdf_failed", files.length)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert images to PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    // Cleanup preview URLs
    files.forEach(file => URL.revokeObjectURL(file.preview))
    
    setFiles([])
    setDownloadUrl(null)
    setProgress(0)
    setIsProcessing(false)
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.IMAGE_FILES)
    localStorage.removeItem(STORAGE_KEYS.IMAGE_ORDER)
  }

  const clearFiles = () => {
    // Cleanup preview URLs
    files.forEach(file => URL.revokeObjectURL(file.preview))
    
    setFiles([])
    setDownloadUrl(null)
    localStorage.removeItem(STORAGE_KEYS.IMAGE_FILES)
    localStorage.removeItem(STORAGE_KEYS.IMAGE_ORDER)
    toast({
      title: "Files cleared",
      description: "All files have been removed.",
    })
  }

  // Cleanup blob URL and preview URLs on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl && downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl)
      }
      files.forEach(file => URL.revokeObjectURL(file.preview))
    }
  }, [downloadUrl, files])

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileType className="h-8 w-8 text-green-600" />
            Image to PDF
          </h1>
          <p className="text-gray-600 mt-1">Convert multiple images into a single PDF document</p>
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
                <CardTitle>Upload Image Files</CardTitle>
                <CardDescription>
                  Select or drag and drop the image files you want to convert to PDF
                  <br />
                  <span className="text-sm text-gray-500 mt-1 block">
                    Supported formats: JPG, PNG, WEBP, GIF, BMP, TIFF
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-green-600">Drop the image files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop image files here, or click to select files</p>
                      <p className="text-sm text-gray-500">Upload multiple image files to convert them into a PDF</p>
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
                      <CardTitle>Images to Convert ({files.length})</CardTitle>
                      <CardDescription>
                        Drag files to reorder them. The order here will be the order in the PDF.
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
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img 
                              src={file.preview} 
                              alt={file.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{file.size} • {file.type}</p>
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
                    <Button onClick={convertToPDF} disabled={files.length < 1 || isProcessing} className="flex-1">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <FileType className="mr-2 h-4 w-4" />
                          Convert {files.length} Image{files.length !== 1 ? 's' : ''} to PDF
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
                      <span>Converting images to PDF...</span>
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
              <CardTitle className="text-green-600">✅ Images Converted Successfully!</CardTitle>
              <CardDescription>Your {files.length} image file{files.length !== 1 ? 's have' : ' has'} been converted to PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild className="flex-1">
                  <a href={downloadUrl} download="converted-images.pdf">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
                <Button variant="outline" onClick={resetTool}>
                  Convert More Images
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your PDF has been generated successfully. 
                  {files.length > 0 && ` It contains ${files.length} image${files.length !== 1 ? 's' : ''}.`}
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
