"use client"

import { useState, useEffect, useRef } from "react"

interface PDFViewerProps {
  pdfUrl: string | null
  currentPage: number
  scale: number
  onLoadSuccess: (data: { numPages: number }) => void
  onLoadError: (error: Error) => void
}

export function PDFViewer({ pdfUrl, currentPage, scale, onLoadSuccess, onLoadError }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [numPages, setNumPages] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfUrl) return

      try {
        setIsLoading(true)
        
        // Import pdfjs-dist directly instead of react-pdf
        const pdfjsLib = await import('pdfjs-dist')
        
        // Try to use local worker, fallback to CDN if needed
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.js`
        } catch (e) {
          // Fallback to a different CDN
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`
        }
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        
        setPdfDoc(pdf)
        setNumPages(pdf.numPages)
        onLoadSuccess({ numPages: pdf.numPages })
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading PDF:', error)
        onLoadError(error instanceof Error ? error : new Error('Failed to load PDF'))
        setIsLoading(false)
      }
    }

    loadPDF()
  }, [pdfUrl, onLoadSuccess, onLoadError])

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return

      // Small delay to ensure canvas is fully mounted
      await new Promise(resolve => setTimeout(resolve, 10))
      
      if (!canvasRef.current) return // Double check after delay

      try {
        const page = await pdfDoc.getPage(currentPage)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        if (!context) {
          console.error('Failed to get 2D context from canvas')
          return
        }
        
        const viewport = page.getViewport({ scale })
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
      } catch (error) {
        console.error('Error rendering page:', error)
      }
    }

    renderPage()
  }, [pdfDoc, currentPage, scale])

  if (isLoading) {
    return <div className="flex justify-center items-center h-96">Loading PDF...</div>
  }

  if (!pdfDoc) {
    return <div className="flex justify-center items-center h-96">Failed to load PDF file.</div>
  }

  return (
    <div className="flex justify-center">
      <canvas 
        ref={canvasRef}
        className="border shadow-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  )
}
