import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { PDFOperationService } from "@/lib/pdf-operation-service"

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

async function processReactEdit(files: File[], accessStatus: any, formData: FormData): Promise<NextResponse> {
  const file = files[0]
  const annotationsData = formData.get('annotations') as string
  const annotations: Annotation[] = JSON.parse(annotationsData || '[]')

  try {
    // Load the PDF
    const pdfBytes = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    
    // Embed fonts and prepare for annotations
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Process annotations by page
    for (const annotation of annotations) {
      const pageIndex = annotation.pageNumber - 1
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex]
        const { width: pageWidth, height: pageHeight } = page.getSize()

        // Convert coordinates (PDF uses bottom-left origin, we use top-left)
        const pdfX = annotation.x
        const pdfY = pageHeight - annotation.y

        try {
          switch (annotation.type) {
            case 'text':
              if (annotation.text) {
                const fontSize = annotation.fontSize || 16
                const color = hexToRgb(annotation.color)
                
                page.drawText(annotation.text, {
                  x: pdfX,
                  y: pdfY - fontSize, // Adjust for text baseline
                  size: fontSize,
                  font: helveticaFont,
                  color: rgb(color.r, color.g, color.b),
                  opacity: annotation.opacity,
                })
              }
              break

            case 'rectangle':
              if (annotation.width && annotation.height) {
                const color = hexToRgb(annotation.color)
                const strokeWidth = annotation.strokeWidth || 2
                
                page.drawRectangle({
                  x: pdfX,
                  y: pdfY - annotation.height,
                  width: annotation.width,
                  height: annotation.height,
                  borderColor: rgb(color.r, color.g, color.b),
                  borderWidth: strokeWidth,
                  opacity: annotation.opacity,
                })
              }
              break

            case 'circle':
              if (annotation.width && annotation.height) {
                const color = hexToRgb(annotation.color)
                const strokeWidth = annotation.strokeWidth || 2
                const radius = Math.min(annotation.width, annotation.height) / 2
                
                page.drawCircle({
                  x: pdfX + radius,
                  y: pdfY - radius,
                  size: radius,
                  borderColor: rgb(color.r, color.g, color.b),
                  borderWidth: strokeWidth,
                  opacity: annotation.opacity,
                })
              }
              break

            case 'drawing':
              if (annotation.points && annotation.points.length > 1) {
                const color = hexToRgb(annotation.color)
                const strokeWidth = annotation.strokeWidth || 2
                
                // Draw lines connecting all points
                for (let i = 0; i < annotation.points.length - 1; i++) {
                  const point1 = annotation.points[i]
                  const point2 = annotation.points[i + 1]
                  
                  page.drawLine({
                    start: { x: point1.x, y: pageHeight - point1.y },
                    end: { x: point2.x, y: pageHeight - point2.y },
                    thickness: strokeWidth,
                    color: rgb(color.r, color.g, color.b),
                    opacity: annotation.opacity,
                  })
                }
              }
              break

            case 'image':
              if (annotation.imageData && annotation.width && annotation.height) {
                try {
                  // Extract base64 data
                  const base64Data = annotation.imageData.split(',')[1]
                  const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
                  
                  // Determine image type and embed
                  let embeddedImage
                  if (annotation.imageData.includes('data:image/png')) {
                    embeddedImage = await pdfDoc.embedPng(imageBytes)
                  } else if (annotation.imageData.includes('data:image/jpeg') || annotation.imageData.includes('data:image/jpg')) {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes)
                  } else {
                    console.warn(`Unsupported image type for annotation ${annotation.id}`)
                    continue
                  }

                  page.drawImage(embeddedImage, {
                    x: pdfX,
                    y: pdfY - annotation.height,
                    width: annotation.width,
                    height: annotation.height,
                    opacity: annotation.opacity,
                  })
                } catch (imageError) {
                  console.error(`Error embedding image for annotation ${annotation.id}:`, imageError)
                }
              }
              break

            default:
              console.warn(`Unsupported annotation type: ${annotation.type}`)
          }
        } catch (annotationError) {
          console.error(`Error processing annotation ${annotation.id}:`, annotationError)
          // Continue with other annotations
        }
      }
    }

    // Add watermark if needed
    await PDFOperationService.addWatermarkIfNeeded(pdfDoc, accessStatus.hasWatermarkFreeAccess)

    // Serialize the PDF
    const editedPdfBytes = await pdfDoc.save()
    
    return PDFOperationService.createPDFResponse(editedPdfBytes, `edited-${file.name}`)

  } catch (error) {
    console.error('Error processing React PDF edit:', error)
    throw error
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove the # if present
  hex = hex.replace('#', '')
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  return { r, g, b }
}

export async function POST(request: NextRequest) {
  const service = new PDFOperationService(request, {
    operationType: 'REACT_EDIT',
    allowSingleFile: true,
    minFiles: 1,
    maxFiles: 1
  })

  return service.handleOperation(processReactEdit)
}
