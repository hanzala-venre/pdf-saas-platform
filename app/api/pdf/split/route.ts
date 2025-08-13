import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"
import { PDFOperationService } from "@/lib/pdf-operation-service"

interface SplitFile {
  filename: string
  data: string
  size: number
}

export async function POST(request: NextRequest) {
  const service = new PDFOperationService(request, {
    operationType: 'SPLIT',
    minFiles: 1,
    maxFiles: 1,
    allowSingleFile: true
  })

  return service.handleOperation(async (files, accessStatus, formData) => {
    const file = files[0]
    const splitMode = formData.get("mode") as string || "pages"
    
    // Parse split parameters based on mode
    let splitPages: number[] = []
    
    switch (splitMode) {
      case "pages": {
        const pageNumbers = formData.get("pages") as string || ""
        splitPages = pageNumbers.split(",")
          .map(p => parseInt(p.trim()))
          .filter(p => !isNaN(p) && p > 0)
        break
      }
      case "range": {
        const rangeStart = parseInt(formData.get("start") as string || "1")
        const rangeEnd = parseInt(formData.get("end") as string || "1")
        if (rangeStart > 0 && rangeEnd >= rangeStart) {
          splitPages = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)
        }
        break
      }
      case "every": {
        const everyN = parseInt(formData.get("every") as string || "1")
        if (everyN > 0) {
          // We'll determine the actual pages after loading the PDF
          splitPages = [everyN] // Temporary, will be recalculated
        }
        break
      }
    }

    if (splitPages.length === 0 && splitMode !== "every") {
      return NextResponse.json({ error: "No valid page numbers specified" }, { status: 400 })
    }

    // Load and process the PDF
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const totalPages = pdfDoc.getPageCount()

    // Handle everyN mode
    if (splitMode === "every") {
      const everyN = splitPages[0]
      splitPages = []
      for (let i = everyN; i < totalPages; i += everyN) {
        splitPages.push(i)
      }
    }

    // Validate page numbers
    const validPages = splitPages.filter(p => p > 0 && p <= totalPages)
    if (validPages.length === 0) {
      return NextResponse.json({ error: "No valid page numbers for splitting" }, { status: 400 })
    }

    // Create split documents
    const splitDocuments: SplitFile[] = []
    let currentPageStart = 1

    for (let i = 0; i <= validPages.length; i++) {
      const splitPoint = i < validPages.length ? validPages[i] : totalPages + 1
      const pageEnd = splitPoint - 1

      if (currentPageStart <= pageEnd && currentPageStart <= totalPages) {
        const newDoc = await PDFDocument.create()
        const pageIndices = Array.from({ length: pageEnd - currentPageStart + 1 }, (_, idx) => currentPageStart - 1 + idx)
        
        const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices)
        copiedPages.forEach(page => newDoc.addPage(page))

        // Add watermark if needed
        await PDFOperationService.addWatermarkIfNeeded(newDoc, accessStatus.hasWatermarkFreeAccess)

        const pdfBytes = await newDoc.save()
        const fileName = `${file.name.replace('.pdf', '')}_part_${i + 1}.pdf`
        
        splitDocuments.push({
          filename: fileName,
          data: Buffer.from(pdfBytes).toString('base64'),
          size: pdfBytes.length
        })
      }

      currentPageStart = splitPoint
    }

    if (splitDocuments.length === 0) {
      return NextResponse.json({ error: "No documents could be created" }, { status: 400 })
    }

    return PDFOperationService.createJSONResponse({
      files: splitDocuments,
      message: `PDF split into ${splitDocuments.length} document${splitDocuments.length > 1 ? 's' : ''}`
    })
  })
}
