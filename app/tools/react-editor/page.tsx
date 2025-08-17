"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { PDFViewer } from "@/components/pdf-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { 
  Upload, 
  FileText, 
  Download, 
  Edit3, 
  Type, 
  Square, 
  Circle, 
  PenTool,
  Trash2,
  Undo,
  Redo,
  RefreshCw,
  Info,
  ArrowLeft,
  ArrowRight,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/hooks/use-analytics"
import { useSubscription } from "@/hooks/use-subscription"
import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"
import { useOneTimePayment } from "@/hooks/use-one-time-payment"
import { WatermarkNotice } from "@/components/watermark-notice"

interface Annotation {
  id: string
  type: 'text' | 'highlight' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'drawing' | 'image'
  pageNumber: number
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  color: string
  fontSize?: number
  strokeWidth?: number
  opacity: number
  rotation?: number
  points?: { x: number; y: number }[]
  imageData?: string
}

interface EditHistory {
  annotations: Annotation[]
  timestamp: number
}

export default function ReactPDFEditor() {
  const [file, setFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Editor state
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [history, setHistory] = useState<EditHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [editingText, setEditingText] = useState<string | null>(null)
  const [currentDrawing, setCurrentDrawing] = useState<{ x: number; y: number }[]>([])
  
  // Tool properties
  const [textInput, setTextInput] = useState("")
  const [fontSize, setFontSize] = useState(16)
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [color, setColor] = useState("#ff0000")
  const [opacity, setOpacity] = useState(100)
  
  const { toast } = useToast()
  const { trackEvent } = useAnalytics()
  const { subscription } = useSubscription()
  const { hasOneTimeAccess } = useOneTimePayment()
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const isPaidUser = subscription?.isPaidUser || false
  const hasWatermarkFreeAccess = isPaidUser || hasOneTimeAccess || false
  
  useEffect(() => {
    trackEvent('react_pdf_editor_page_view', 'tools')
  }, [trackEvent])

  // Clear canvas preview when switching tools or pages
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [selectedTool, currentPage])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0]
    if (pdfFile && pdfFile.type === "application/pdf") {
      setFile(pdfFile)
      const url = URL.createObjectURL(pdfFile)
      setPdfUrl(url)
      setError(null)
      setAnnotations([])
      setHistory([])
      setHistoryIndex(-1)
      setCurrentPage(1)
      trackEvent('react_pdf_editor_file_uploaded', 'tools', 'file_uploaded')
    } else {
      setError("Please upload a valid PDF file")
      toast({
        title: "Invalid file",
        description: "Please upload a valid PDF file",
        variant: "destructive",
      })
    }
  }, [toast, trackEvent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    multiple: false,
  })

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error)
    setError("Failed to load PDF document")
    setIsLoading(false)
  }

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({
      annotations: [...annotations],
      timestamp: Date.now()
    })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const addAnnotation = (annotation: Omit<Annotation, 'id'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
    
    saveToHistory()
    setAnnotations(prev => [...prev, newAnnotation])
    trackEvent('react_pdf_editor_annotation_added', 'tools', annotation.type)
  }

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    saveToHistory()
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ))
  }

  const deleteAnnotation = (id: string) => {
    saveToHistory()
    setAnnotations(prev => prev.filter(ann => ann.id !== id))
    setSelectedAnnotation(null)
    trackEvent('react_pdf_editor_annotation_deleted', 'tools')
  }

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setAnnotations(prevState.annotations)
      setHistoryIndex(historyIndex - 1)
      trackEvent('react_pdf_editor_undo', 'tools')
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setAnnotations(nextState.annotations)
      setHistoryIndex(historyIndex + 1)
      trackEvent('react_pdf_editor_redo', 'tools')
    }
  }

  const clearAll = () => {
    saveToHistory()
    setAnnotations([])
    setSelectedAnnotation(null)
    trackEvent('react_pdf_editor_clear_all', 'tools')
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    
    if (selectedTool === 'drawing') {
      setIsDrawing(true)
      setCurrentDrawing([{ x, y }])
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      setIsDragging(true)
      setDragStart({ x, y })
    } else if (selectedTool === 'text') {
      // Add text directly at click position
      const newText = prompt('Enter text:')
      if (newText) {
        addAnnotation({
          type: 'text',
          pageNumber: currentPage,
          x,
          y,
          width: 200,
          height: 30,
          text: newText,
          color,
          fontSize,
          opacity: opacity / 100
        })
      }
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    
    if (isDrawing && selectedTool === 'drawing') {
      setCurrentDrawing(prev => [...prev, { x, y }])
    } else if (isDragging && dragStart && (selectedTool === 'rectangle' || selectedTool === 'circle')) {
      // Show preview of shape being drawn
      const width = Math.abs(x - dragStart.x)
      const height = Math.abs(y - dragStart.y)
      
      // Update canvas with preview
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth * scale
        ctx.globalAlpha = opacity / 100
        
        const startX = Math.min(dragStart.x, x) * scale
        const startY = Math.min(dragStart.y, y) * scale
        const previewWidth = width * scale
        const previewHeight = height * scale
        
        if (selectedTool === 'rectangle') {
          ctx.strokeRect(startX, startY, previewWidth, previewHeight)
        } else if (selectedTool === 'circle') {
          const centerX = startX + previewWidth / 2
          const centerY = startY + previewHeight / 2
          const radius = Math.min(previewWidth, previewHeight) / 2
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
    }
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    
    if (isDrawing && selectedTool === 'drawing' && currentDrawing.length > 1) {
      addAnnotation({
        type: 'drawing',
        pageNumber: currentPage,
        x: Math.min(...currentDrawing.map(p => p.x)),
        y: Math.min(...currentDrawing.map(p => p.y)),
        points: currentDrawing,
        color,
        strokeWidth,
        opacity: opacity / 100
      })
      setCurrentDrawing([])
    } else if (isDragging && dragStart && (selectedTool === 'rectangle' || selectedTool === 'circle')) {
      const width = Math.abs(x - dragStart.x)
      const height = Math.abs(y - dragStart.y)
      
      if (width > 5 && height > 5) { // Minimum size check
        addAnnotation({
          type: selectedTool,
          pageNumber: currentPage,
          x: Math.min(dragStart.x, x),
          y: Math.min(dragStart.y, y),
          width,
          height,
          color,
          strokeWidth,
          opacity: opacity / 100
        })
      }
      
      // Clear canvas preview
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    
    setIsDrawing(false)
    setIsDragging(false)
    setDragStart(null)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0]
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        addAnnotation({
          type: 'image',
          pageNumber: currentPage,
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          imageData,
          color: '#000000',
          opacity: opacity / 100
        })
      }
      reader.readAsDataURL(imageFile)
    }
  }

  const downloadEditedPDF = async () => {
    if (!file) {
      toast({
        title: "No file",
        description: "Please upload a PDF file first",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    trackEvent('react_pdf_editor_download_started', 'tools')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('annotations', JSON.stringify(annotations))
      formData.append('hasWatermarkFreeAccess', hasWatermarkFreeAccess.toString())

      const response = await fetch('/api/pdf/react-edit', {
        method: 'POST',
        body: formData,
        headers: {
          'x-one-time-access': hasOneTimeAccess.toString()
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `edited-${file.name}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Success",
          description: "PDF edited and downloaded successfully",
        })

        trackEvent('react_pdf_editor_download_completed', 'tools', 'download_completed')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process PDF')
      }
    } catch (error) {
      console.error('Error downloading edited PDF:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive",
      })
      trackEvent('react_pdf_editor_download_error', 'tools')
    } finally {
      setIsProcessing(false)
    }
  }

  const pageAnnotations = annotations.filter(ann => ann.pageNumber === currentPage)

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">React PDF Editor</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Advanced PDF editor with annotations, drawings, text, and image insertion using React PDF technology
          </p>
        </div>

        <WatermarkNotice isPaidUser={hasWatermarkFreeAccess} />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Section */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF
              </CardTitle>
              <CardDescription>
                Upload a PDF file to start editing with advanced React PDF tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the PDF file here...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg">Drag & drop a PDF file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">Upload any PDF file to get started</p>
                  </div>
                )}
              </div>
              {error && (
                <Alert className="mt-4" variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {file && (
            <>
              {/* Tools Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Editor Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tool Selection */}
                  <div className="space-y-3">
                    <Label>Select Tool</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedTool === 'select' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('select')}
                      >
                        <MousePointer className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                      <Button
                        variant={selectedTool === 'text' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('text')}
                      >
                        <Type className="h-4 w-4 mr-1" />
                        Text
                      </Button>
                      <Button
                        variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('rectangle')}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Rectangle
                      </Button>
                      <Button
                        variant={selectedTool === 'circle' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('circle')}
                      >
                        <Circle className="h-4 w-4 mr-1" />
                        Circle
                      </Button>
                      <Button
                        variant={selectedTool === 'drawing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTool('drawing')}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        Draw
                      </Button>
                      <Button
                        variant={selectedTool === 'image' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedTool('image')
                          fileInputRef.current?.click()
                        }}
                      >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Image
                      </Button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />

                  <Separator />

                  {/* Properties */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {selectedTool === 'text' && (
                      <div className="space-y-2">
                        <Label>Font Size: {fontSize}px</Label>
                        <Slider
                          value={[fontSize]}
                          onValueChange={(value) => setFontSize(value[0])}
                          min={8}
                          max={72}
                          step={1}
                        />
                      </div>
                    )}

                    {(selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'drawing') && (
                      <div className="space-y-2">
                        <Label>Stroke Width: {strokeWidth}px</Label>
                        <Slider
                          value={[strokeWidth]}
                          onValueChange={(value) => setStrokeWidth(value[0])}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Opacity: {opacity}%</Label>
                      <Slider
                        value={[opacity]}
                        onValueChange={(value) => setOpacity(value[0])}
                        min={10}
                        max={100}
                        step={10}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearAll}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>

                  <Separator />

                  {/* Download */}
                  <Button
                    onClick={downloadEditedPDF}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing ? "Processing..." : "Download Edited PDF"}
                  </Button>
                </CardContent>
              </Card>

              {/* PDF Viewer */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      PDF Editor - Page {currentPage} of {numPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                        disabled={currentPage >= numPages}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScale(Math.max(0.5, scale - 0.2))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScale(Math.min(3, scale + 0.2))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative border rounded-lg overflow-auto bg-gray-50" style={{ height: '70vh' }}>
                    {pdfUrl && (
                      <div className="relative">
                        <PDFViewer
                          pdfUrl={pdfUrl}
                          currentPage={currentPage}
                          scale={scale}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                        />
                        <div className="absolute top-0 left-0">
                          <canvas
                            ref={canvasRef}
                            className="cursor-crosshair"
                            width={595 * scale}
                            height={842 * scale}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            style={{
                              width: `${595 * scale}px`,
                              height: `${842 * scale}px`,
                              pointerEvents: selectedTool === 'select' ? 'none' : 'auto'
                            }}
                          />
                        
                          {/* Render annotations */}
                          {pageAnnotations.map((annotation) => (
                            <div
                              key={annotation.id}
                              className={`absolute pointer-events-auto cursor-move border-2 ${
                                selectedAnnotation === annotation.id ? 'border-blue-500' : 'border-transparent'
                              } hover:border-blue-300`}
                              style={{
                                left: `${annotation.x * scale}px`,
                                top: `${annotation.y * scale}px`,
                                width: annotation.width ? `${annotation.width * scale}px` : 'auto',
                                height: annotation.height ? `${annotation.height * scale}px` : 'auto',
                                opacity: annotation.opacity,
                                transform: annotation.rotation ? `rotate(${annotation.rotation}deg)` : undefined,
                                minWidth: annotation.type === 'text' ? 'auto' : undefined,
                                minHeight: annotation.type === 'text' ? 'auto' : undefined
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAnnotation(annotation.id)
                                if (annotation.type === 'text') {
                                  setEditingText(annotation.id)
                                  setTextInput(annotation.text || '')
                                }
                              }}
                            >
                              {annotation.type === 'text' && (
                                <>
                                  {editingText === annotation.id ? (
                                    <input
                                      type="text"
                                      value={textInput}
                                      onChange={(e) => setTextInput(e.target.value)}
                                      onBlur={() => {
                                        // Update annotation text
                                        setAnnotations(prev => prev.map(ann => 
                                          ann.id === annotation.id 
                                            ? { ...ann, text: textInput }
                                            : ann
                                        ))
                                        setEditingText(null)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          setAnnotations(prev => prev.map(ann => 
                                            ann.id === annotation.id 
                                              ? { ...ann, text: textInput }
                                              : ann
                                          ))
                                          setEditingText(null)
                                        }
                                      }}
                                      autoFocus
                                      className="bg-transparent border-none outline-none w-full"
                                      style={{
                                        color: annotation.color,
                                        fontSize: `${annotation.fontSize! * scale}px`,
                                        fontFamily: 'Arial, sans-serif'
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        color: annotation.color,
                                        fontSize: `${annotation.fontSize! * scale}px`,
                                        fontFamily: 'Arial, sans-serif',
                                        whiteSpace: 'pre-wrap',
                                        cursor: 'text'
                                      }}
                                      onDoubleClick={() => {
                                        setEditingText(annotation.id)
                                        setTextInput(annotation.text || '')
                                      }}
                                    >
                                      {annotation.text}
                                    </div>
                                  )}
                                </>
                              )}
                              
                              {annotation.type === 'rectangle' && (
                                <div
                                  style={{
                                    border: `${annotation.strokeWidth! * scale}px solid ${annotation.color}`,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              )}
                              
                              {annotation.type === 'circle' && (
                                <div
                                  style={{
                                    border: `${annotation.strokeWidth! * scale}px solid ${annotation.color}`,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    backgroundColor: 'transparent'
                                  }}
                                />
                              )}
                              
                              {annotation.type === 'drawing' && (
                                <svg
                                  width="100%"
                                  height="100%"
                                  style={{ overflow: 'visible' }}
                                >
                                  <path
                                    d={`M ${annotation.points?.map(p => `${(p.x - annotation.x) * scale},${(p.y - annotation.y) * scale}`).join(' L ')}`}
                                    stroke={annotation.color}
                                    strokeWidth={annotation.strokeWidth! * scale}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                              
                              {annotation.type === 'image' && (
                                <img
                                  src={annotation.imageData}
                                  alt="Annotation"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                  }}
                                />
                              )}
                              
                              {/* Resize handles for selected annotation */}
                              {selectedAnnotation === annotation.id && annotation.type !== 'text' && (
                                <>
                                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize" />
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize" />
                                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize" />
                                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize" />
                                </>
                              )}
                              
                              {/* Delete button for selected annotation */}
                              {selectedAnnotation === annotation.id && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-8 -right-8 w-6 h-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteAnnotation(annotation.id)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {pageAnnotations.length > 0 && (
                    <div className="mt-4">
                      <Badge variant="secondary">
                        {pageAnnotations.length} annotation{pageAnnotations.length !== 1 ? 's' : ''} on this page
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
