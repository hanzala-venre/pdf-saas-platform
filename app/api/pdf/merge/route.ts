import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { Session } from "next-auth"
import { checkWatermarkFreeAccess, checkUsageLimits } from "@/lib/watermark-utils"
import { PDFOperationService } from "@/lib/pdf-operation-service"

export async function POST(request: NextRequest) {
  try {
    // Check watermark-free access (supports both subscription and one-time payment)
    const accessStatus = await checkWatermarkFreeAccess(request)
    const session = await getServerSession(authOptions) as Session | null

    // For logged-in users, check usage limits if they're on free plan
    if (session?.user?.email && !accessStatus.hasWatermarkFreeAccess) {
      if (accessStatus.userId) {
        const usageLimits = await checkUsageLimits(accessStatus.userId)
        if (!usageLimits.canUse) {
          return NextResponse.json({ 
            error: "Usage limit exceeded. Upgrade to continue.",
            usageInfo: usageLimits
          }, { status: 429 })
        }
      }
    }

    const formData = await request.formData()
    
    // Get all files from the form data
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length < 2) {
      return NextResponse.json({ error: "At least 2 PDF files are required for merging" }, { status: 400 })
    }

    // Validate that all files are PDFs
    for (const file of files) {
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: `File ${file.name} is not a valid PDF` }, { status: 400 })
      }
    }

    // Create a new PDF document for merging
    const mergedPdf = await PDFDocument.create()
    let totalPages = 0

    // Process each PDF file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const pageCount = pdf.getPageCount()
        
        // Copy all pages from the current PDF
        const copiedPages = await mergedPdf.copyPages(pdf, Array.from({ length: pageCount }, (_, i) => i))
        
        // Add the copied pages to the merged PDF
        copiedPages.forEach(page => {
          mergedPdf.addPage(page)
          totalPages++
        })
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        return NextResponse.json({ error: `Failed to process ${file.name}. Please ensure it's a valid PDF.` }, { status: 400 })
      }
    }

    // Add watermark for users without watermark-free access
    await PDFOperationService.addWatermarkIfNeeded(mergedPdf, accessStatus.hasWatermarkFreeAccess)

    // Generate the final PDF
    const pdfBytes = await mergedPdf.save()

    // Log the operation (only for logged-in users)
    if (session?.user?.email && accessStatus.userId) {
      await prisma.pdfOperation.create({
        data: {
          userId: accessStatus.userId,
          type: "MERGE",
          fileName: `merged-${files.length}-files.pdf`,
          fileSize: files.reduce((total, file) => total + file.size, 0),
          status: "COMPLETED",
        },
      })
    }

    // Return the merged PDF
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged-document.pdf"',
        "Content-Length": pdfBytes.length.toString(),
      },
    })

  } catch (error) {
    console.error("Error merging PDFs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


