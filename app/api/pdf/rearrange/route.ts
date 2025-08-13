import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const pageOrderStr = formData.get("pageOrder") as string
    const hasWatermarkFreeAccess = formData.get("hasWatermarkFreeAccess") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!pageOrderStr) {
      return NextResponse.json({ error: "No page order specified" }, { status: 400 })
    }

    const pageOrder = JSON.parse(pageOrderStr) as number[]

    // Read the PDF
    const pdfBytes = new Uint8Array(await file.arrayBuffer())
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    // Create a new PDF document
    const newPdfDoc = await PDFDocument.create()

    // Copy pages in the specified order
    for (const pageNumber of pageOrder) {
      if (pageNumber > 0 && pageNumber <= pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1])
        newPdfDoc.addPage(copiedPage)
      }
    }

    // Add watermark if not a paid user
    if (!hasWatermarkFreeAccess) {
      const pages = newPdfDoc.getPages()
      pages.forEach((page) => {
        const { width } = page.getSize()
        page.drawText("Generated with QuikPDF - Get Premium for watermark-free PDFs", {
          x: 50,
          y: 20,
          size: 8,
          opacity: 0.5,
        })
      })
    }

    // Serialize the PDF
    const newPdfBytes = await newPdfDoc.save()

    return new NextResponse(newPdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=rearranged-pages.pdf",
      },
    })
  } catch (error) {
    console.error("Error rearranging PDF pages:", error)
    return NextResponse.json(
      { error: "Failed to rearrange PDF pages" },
      { status: 500 }
    )
  }
}
