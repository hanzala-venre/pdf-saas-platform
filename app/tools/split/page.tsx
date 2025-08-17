"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, FileText, Download, Split, Scissors, Trash2, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { WatermarkNotice, SubscriptionStatus, OneTimeAccessStatus } from "@/components/watermark-notice"
import { usePDFStorage, PDFStorageUtils } from "@/hooks/use-pdf-storage"

type SplitMode = "pages" | "range" | "every"

interface SplitFile {
  filename: string
  data: string
  size: number
  url?: string
}

// Local storage keys
const STORAGE_KEYS = {
  UPLOADED_FILE: 'pdf_split_uploaded_file',
  SPLIT_MODE: 'pdf_split_mode',
  PAGE_NUMBERS: 'pdf_split_page_numbers',
  RANGE_START: 'pdf_split_range_start',
  RANGE_END: 'pdf_split_range_end',
  EVERY_N: 'pdf_split_every_n',
  SPLIT_FILES: 'pdf_split_files'
}

export default function SplitPDFPage() {
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
  } = toolAccess

  // Use custom hooks for local storage
  const [splitMode, setSplitMode] = usePDFStorage(STORAGE_KEYS.SPLIT_MODE, "pages")
  const [pageNumbers, setPageNumbers] = usePDFStorage(STORAGE_KEYS.PAGE_NUMBERS, "")
  const [rangeStart, setRangeStart] = usePDFStorage(STORAGE_KEYS.RANGE_START, "")
  const [rangeEnd, setRangeEnd] = usePDFStorage(STORAGE_KEYS.RANGE_END, "")
  const [everyN, setEveryN] = usePDFStorage(STORAGE_KEYS.EVERY_N, "1")
  const [splitFiles, setSplitFiles] = usePDFStorage(STORAGE_KEYS.SPLIT_FILES, [])

  // Create blob URLs for saved files on component mount
  useEffect(() => {
    if (splitFiles.length > 0) {
      const filesWithUrls = splitFiles.map((file: SplitFile) => ({
        ...file,
        url: file.url || PDFStorageUtils.createBlobFromBase64(file.data, file.filename)
      }))
      if (filesWithUrls.some((f: SplitFile) => f.url !== splitFiles.find((sf: SplitFile) => sf.filename === f.filename)?.url)) {
        setSplitFiles(filesWithUrls)
      }
    }
  }, [])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (splitFiles.length > 0) {
        const urls = splitFiles.map((f: SplitFile) => f.url).filter((url: string) => url?.startsWith('blob:'))
        PDFStorageUtils.cleanupBlobUrls(urls)
      }
    }
  }, [])

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
      setSplitFiles([])
      trackPDFOperation("file_uploaded", 1)
    },
    [toast, trackPDFOperation, setSplitFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  })

  const splitPDF = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first.",
        variant: "destructive",
      })
      return
    }

    // Validate inputs based on split mode
    if (splitMode === "pages" && !pageNumbers.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter page numbers to extract.",
        variant: "destructive",
      })
      return
    }

    if (splitMode === "range" && (!rangeStart || !rangeEnd)) {
      toast({
        title: "Invalid range",
        description: "Please enter both start and end page numbers.",
        variant: "destructive",
      })
      return
    }

    if (splitMode === "every" && (!everyN || parseInt(everyN) < 1)) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid number of pages.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    trackPDFOperation("split_started", 1)

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
      formData.append("mode", splitMode)

      if (splitMode === "pages") {
        formData.append("pages", pageNumbers)
      } else if (splitMode === "range") {
        formData.append("start", rangeStart)
        formData.append("end", rangeEnd)
      } else if (splitMode === "every") {
        formData.append("every", everyN)
      }

      const response = await apiClient.post("/api/pdf/split", formData)

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to split PDF")
      }

      const result = await response.json()
      
      if (result.success && result.files) {
        // Create blob URLs for the split files
        const filesWithUrls = result.files.map((file: SplitFile) => ({
          ...file,
          url: PDFStorageUtils.createBlobFromBase64(file.data, file.filename)
        }))
        
        setSplitFiles(filesWithUrls)

        trackPDFOperation("split_completed", result.files.length)
        toast({
          title: "Success!",
          description: `Your PDF has been split into ${result.files.length} files.`,
        })
      } else {
        throw new Error("No files returned from split operation")
      }
    } catch (error) {
      console.error("Error splitting PDF:", error)
      trackPDFOperation("split_failed", 1)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to split PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetTool = () => {
    setFile(null)
    setSplitFiles([])
    setProgress(0)
    setIsProcessing(false)
    setPageNumbers("")
    setRangeStart("")
    setRangeEnd("")
    setEveryN("1")
    setSplitMode("pages")
  }

  const clearResults = () => {
    setSplitFiles([])
    toast({
      title: "Results cleared",
      description: "All split files have been cleared.",
    })
  }

  const downloadAllFiles = () => {
    splitFiles.forEach((file: SplitFile, index: number) => {
      if (file.url) {
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a')
        link.href = file.url
        link.download = file.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Add a small delay between downloads to avoid issues
        setTimeout(() => {}, index * 100)
      }
    })
    
    trackPDFOperation("bulk_download", splitFiles.length)
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Split className="h-8 w-8 text-green-600" />
            Split PDF
          </h1>
          <p className="text-gray-600 mt-1">Extract pages or split PDFs into separate documents</p>
        </div>

        <WatermarkNotice />

        {/* Subscription Status */}
        {!subscriptionLoading && subscription && (
          <>
            <SubscriptionStatus />
          </>
        )}

        {splitFiles.length === 0 ? (
          <>
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Upload PDF File</CardTitle>
                <CardDescription>Select the PDF file you want to split</CardDescription>
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
                    <p className="text-green-600">Drop the PDF file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop a PDF file here, or click to select</p>
                      <p className="text-sm text-gray-500">Upload one PDF file to split it</p>
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

            {/* Split Options */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle>Split Options</CardTitle>
                  <CardDescription>Choose how you want to split your PDF</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup value={splitMode} onValueChange={(value) => setSplitMode(value as SplitMode)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pages" id="pages" />
                      <Label htmlFor="pages">Extract specific pages</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="range" id="range" />
                      <Label htmlFor="range">Extract page range</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="every" id="every" />
                      <Label htmlFor="every">Split every N pages</Label>
                    </div>
                  </RadioGroup>

                  {splitMode === "pages" && (
                    <div>
                      <Label htmlFor="pageNumbers">Page Numbers</Label>
                      <Input
                        id="pageNumbers"
                        placeholder="e.g., 1,3,5-7,10"
                        value={pageNumbers}
                        onChange={(e) => setPageNumbers(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Enter page numbers separated by commas. Use ranges like 5-7.
                      </p>
                    </div>
                  )}

                  {splitMode === "range" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rangeStart">Start Page</Label>
                        <Input
                          id="rangeStart"
                          type="number"
                          placeholder="1"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rangeEnd">End Page</Label>
                        <Input
                          id="rangeEnd"
                          type="number"
                          placeholder="10"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {splitMode === "every" && (
                    <div>
                      <Label htmlFor="everyN">Split every N pages</Label>
                      <Input
                        id="everyN"
                        type="number"
                        placeholder="1"
                        min="1"
                        value={everyN}
                        onChange={(e) => setEveryN(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">Each output file will contain N pages.</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button onClick={splitPDF} disabled={isProcessing} className="flex-1">
                      {isProcessing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scissors className="mr-2 h-4 w-4" />
                          Split PDF
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
                      <span>Splitting PDF...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Download Results */
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ PDF Split Successfully!</CardTitle>
              <CardDescription>Your PDF has been split into {splitFiles.length} files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button onClick={downloadAllFiles} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download All Files
                  </Button>
                  <Button variant="outline" onClick={clearResults}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Results
                  </Button>
                  <Button variant="outline" onClick={resetTool}>
                    Split Another PDF
                  </Button>
                </div>

                <div className="grid gap-2">
                  {splitFiles.map((file: SplitFile, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-red-600" />
                        <div>
                          <span className="font-medium">{file.filename}</span>
                          <p className="text-sm text-gray-500">{PDFStorageUtils.formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <a href={file.url} download={file.filename}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
