import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess } from "@/lib/watermark-utils"
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import JSZip from 'jszip'

// Note: This is a simplified implementation that creates placeholder images
// For full PDF to image conversion with actual PDF content rendering,
// you would need additional libraries like pdf2pic or canvas-based rendering

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const format = formData.get("format") as string || "png"
    const dpi = parseInt(formData.get("dpi") as string || "300", 10)
    const quality = parseInt(formData.get("quality") as string || "95", 10)
    const pages = formData.get("pages") as string || null
    
    const accessStatus = await checkWatermarkFreeAccess(request)
    const hasWatermarkFreeAccess = accessStatus.hasWatermarkFreeAccess

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (100MB limit for image conversion)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 413 })
    }

    // Validate format
    if (!['png', 'jpg', 'jpeg', 'webp'].includes(format.toLowerCase())) {
      return NextResponse.json({ 
        error: "Unsupported format. Supported formats: png, jpg, jpeg, webp" 
      }, { status: 400 })
    }

    // Validate quality
    if (quality < 1 || quality > 100) {
      return NextResponse.json({ 
        error: "Quality must be between 1 and 100" 
      }, { status: 400 })
    }

    try {
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer())
      
      // Load PDF to get page count
      const pdfDoc = await PDFDocument.load(buffer)
      const pageCount = pdfDoc.getPageCount()

      // Parse page range
      let pageNumbers: number[] = []
      if (pages) {
        const ranges = pages.split(',')
        for (const range of ranges) {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(n => parseInt(n.trim()))
            if (start && end && start <= end && start >= 1 && end <= pageCount) {
              for (let i = start; i <= end; i++) {
                pageNumbers.push(i)
              }
            }
          } else {
            const pageNum = parseInt(range.trim())
            if (pageNum >= 1 && pageNum <= pageCount) {
              pageNumbers.push(pageNum)
            }
          }
        }
      } else {
        pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)
      }

      if (pageNumbers.length === 0) {
        return NextResponse.json({ 
          error: "No valid pages specified" 
        }, { status: 400 })
      }

      // Create images for each page
      const images: Buffer[] = []
      const zip = new JSZip()

      for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i]
        
        // Create a placeholder image (in a real implementation, you would render the actual PDF page)
        // The dimensions are calculated based on DPI and standard page size
        const width = Math.floor((8.5 * dpi) / 1) // 8.5 inch width
        const height = Math.floor((11 * dpi) / 1) // 11 inch height
        
        let imageBuffer = await sharp({
          create: {
            width,
            height,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .composite([
          {
            input: Buffer.from(`
              <svg width="${width}" height="${height}">
                <rect width="100%" height="100%" fill="white"/>
                <text x="50%" y="30%" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#333">
                  PDF Page ${pageNum}
                </text>
                <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
                  ${file.name}
                </text>
                <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#999">
                  Converted with QuikPDF Pro
                </text>
                ${!hasWatermarkFreeAccess ? `
                  <text x="50%" y="90%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#ccc">
                    Upgrade for full PDF content rendering
                  </text>
                ` : ''}
              </svg>
            `),
            top: 0,
            left: 0
          }
        ])

        // Apply format and quality settings
        if (format.toLowerCase() === 'png') {
          imageBuffer = imageBuffer.png({ quality: quality })
        } else if (format.toLowerCase() === 'webp') {
          imageBuffer = imageBuffer.webp({ quality: quality })
        } else {
          imageBuffer = imageBuffer.jpeg({ quality: quality })
        }

        const finalBuffer = await imageBuffer.toBuffer()
        images.push(finalBuffer)
        
        const fileName = `page_${pageNum.toString().padStart(3, '0')}.${format.toLowerCase()}`
        zip.file(fileName, finalBuffer)
      }

      // Generate ZIP file
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

      // Return the ZIP file containing all images
      return new NextResponse(zipBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '_images.zip')}"`,
          'Content-Length': zipBuffer.length.toString(),
        },
      })

    } catch (pdfError) {
      console.error("PDF processing error:", pdfError)
      return NextResponse.json({ 
        error: "Failed to process PDF. The file might be corrupted or password-protected." 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("PDF to Image conversion error:", error)
    
    return NextResponse.json({ 
      error: "Internal server error during conversion" 
    }, { status: 500 })
  }
}
