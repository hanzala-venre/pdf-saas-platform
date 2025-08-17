import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { Session } from "next-auth"
import { checkWatermarkFreeAccess, consumeOneTimeCredit } from "@/lib/watermark-utils"
import { PDFOperationService } from "@/lib/pdf-operation-service"

// Supported image types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
]

export async function POST(request: NextRequest) {
  try {
    // Check watermark-free access (supports both subscription and one-time payment)
    const accessStatus = await checkWatermarkFreeAccess(request)
    const session = await getServerSession(authOptions) as Session | null

    // For logged-in users, we no longer check usage limits - unlimited for everyone
    // Usage tracking is still done for analytics but no limits are enforced

    const formData = await request.formData()
    
    // Get all files from the form data
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least 1 image file is required" }, { status: 400 })
    }

    // Validate that all files are supported image types
    for (const file of files) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json({ 
          error: `File ${file.name} is not a supported image type. Supported: JPG, PNG, WEBP, GIF, BMP, TIFF` 
        }, { status: 400 })
      }
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    
    // Process each image file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        let image

        // Embed image based on type
        if (file.type === 'image/jpeg') {
          image = await pdfDoc.embedJpg(arrayBuffer)
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(arrayBuffer)
        } else {
          // For other formats (webp, gif, bmp, tiff), we need to convert to PNG first
          // This is a simplified approach - in production you might want to use a proper image conversion library
          try {
            // Try to embed as PNG (this might work for some formats)
            image = await pdfDoc.embedPng(arrayBuffer)
          } catch {
            // If that fails, try as JPEG
            try {
              image = await pdfDoc.embedJpg(arrayBuffer)
            } catch {
              throw new Error(`Unsupported image format: ${file.type}`)
            }
          }
        }

        // Get image dimensions
        const imageDims = image.scale(1)
        
        // Create a new page with appropriate size
        // Scale down if image is too large, maintaining aspect ratio
        const maxWidth = 595 // A4 width in points
        const maxHeight = 842 // A4 height in points
        
        let pageWidth = imageDims.width
        let pageHeight = imageDims.height
        
        // Scale down if necessary
        if (pageWidth > maxWidth || pageHeight > maxHeight) {
          const scaleX = maxWidth / pageWidth
          const scaleY = maxHeight / pageHeight
          const scale = Math.min(scaleX, scaleY)
          
          pageWidth = pageWidth * scale
          pageHeight = pageHeight * scale
        }
        
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        
        // Draw the image to fill the page
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        })
        
      } catch (error) {
        console.error(`Error processing image ${file.name}:`, error)
        return NextResponse.json({ 
          error: `Failed to process ${file.name}. Please ensure it's a valid image file.` 
        }, { status: 400 })
      }
    }

    // Add watermark for users without watermark-free access
    await PDFOperationService.addWatermarkIfNeeded(pdfDoc, accessStatus.hasWatermarkFreeAccess)

    // Generate the final PDF
    const pdfBytes = await pdfDoc.save()

    // Log the operation (only for logged-in users)
    if (session?.user?.email && accessStatus.userId) {
      await prisma.pdfOperation.create({
        data: {
          userId: accessStatus.userId,
          type: "IMAGE_TO_PDF",
          fileName: `images-to-pdf-${files.length}-files.pdf`,
          fileSize: files.reduce((total, file) => total + file.size, 0),
          status: "COMPLETED",
        },
      })
    }

    // If using one-time access, consume the credit immediately after successful operation
    let headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="converted-images.pdf"',
      "Content-Length": pdfBytes.length.toString(),
    }
    
    if (accessStatus.shouldConsumeCredit) {
      await consumeOneTimeCredit(request)
      headers['x-one-time-credit-consumed'] = 'true'
    }

    // Return the PDF
    return new NextResponse(Buffer.from(pdfBytes), { headers })

  } catch (error) {
    console.error("Error in image-to-pdf operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
