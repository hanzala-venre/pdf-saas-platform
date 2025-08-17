import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess } from "@/lib/watermark-utils"
import pdf from 'pdf-parse'
import pptx from 'pptxgenjs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const slidesPerPage = parseInt(formData.get("slides_per_page") as string || "1", 10)
    
    const accessStatus = await checkWatermarkFreeAccess(request)
    const hasWatermarkFreeAccess = accessStatus.hasWatermarkFreeAccess

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (very high limit for unlimited usage)
    const maxSize = 1024 * 1024 * 1024 // 1GB - effectively unlimited for practical use
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024 * 1024)}GB` 
      }, { status: 413 })
    }

    // Validate slides per page
    if (slidesPerPage < 1 || slidesPerPage > 5) {
      return NextResponse.json({ 
        error: "Slides per page must be between 1 and 5" 
      }, { status: 400 })
    }

    try {
      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer())
      
      // Parse PDF to extract text
      const pdfData = await pdf(buffer)
      const text = pdfData.text

      if (!text || text.trim().length === 0) {
        return NextResponse.json({ 
          error: "No text content found in PDF. The PDF might contain only images or be corrupted." 
        }, { status: 400 })
      }

      // Create PowerPoint presentation
      const presentation = new pptx()
      presentation.author = "QuikPDF Pro"
      presentation.title = file.name.replace('.pdf', '.pptx')
      presentation.subject = "Converted from PDF"

      // Split text into chunks based on pages or sections
      const textChunks = text.split('\n\n').filter(chunk => chunk.trim().length > 0)
      const chunksPerSlide = Math.max(1, Math.floor(textChunks.length / slidesPerPage))
      
      let slideNumber = 1
      for (let i = 0; i < textChunks.length; i += chunksPerSlide) {
        const slide = presentation.addSlide()
        
        // Add title
        slide.addText(`Slide ${slideNumber}`, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 24,
          bold: true,
          color: '363636',
        })

        // Add content
        const slideContent = textChunks.slice(i, i + chunksPerSlide).join('\n\n')
        slide.addText(slideContent, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 5.5,
          fontSize: 14,
          color: '363636',
          valign: 'top',
          wrap: true,
        })

        // Add watermark for free users
        if (!hasWatermarkFreeAccess) {
          slide.addText("QuikPDF Pro - Upgrade for watermark-free conversions", {
            x: 0.5,
            y: 7.2,
            w: 9,
            h: 0.3,
            fontSize: 10,
            color: 'BBBBBB',
            italic: true,
            align: 'center',
          })
        }

        slideNumber++
      }

      // Generate PowerPoint buffer
      const pptxData = await presentation.write({ outputType: 'nodebuffer' })
      const pptxBuffer = Buffer.from(pptxData as ArrayBuffer)

      // Return the PowerPoint document
      return new NextResponse(pptxBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.pptx')}"`,
          'Content-Length': pptxBuffer.length.toString(),
        },
      })

    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError)
      return NextResponse.json({ 
        error: "Failed to parse PDF content. The file might be corrupted or password-protected." 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("PDF to PowerPoint conversion error:", error)
    
    return NextResponse.json({ 
      error: "Internal server error during conversion" 
    }, { status: 500 })
  }
}
