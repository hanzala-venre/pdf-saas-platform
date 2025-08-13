import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Read the PDF
    const pdfBytes = new Uint8Array(await file.arrayBuffer())
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    const totalPages = pdfDoc.getPageCount()

    return NextResponse.json({
      totalPages,
      message: "PDF analyzed successfully"
    })
  } catch (error) {
    console.error("Error analyzing PDF:", error)
    return NextResponse.json(
      { error: "Failed to analyze PDF" },
      { status: 500 }
    )
  }
}
