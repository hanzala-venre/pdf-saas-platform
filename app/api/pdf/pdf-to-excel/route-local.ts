import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess } from "@/lib/watermark-utils"
// Import dynamically to avoid build issues
// import pdf from 'pdf-parse'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const pdf = (await import('pdf-parse')).default
    
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    const accessStatus = await checkWatermarkFreeAccess(request)
    const hasWatermarkFreeAccess = accessStatus.hasWatermarkFreeAccess

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 413 })
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

      // Create a new workbook
      const workbook = XLSX.utils.book_new()
      
      // Process text into rows and columns
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      const data: string[][] = []
      
      // Add header
      data.push(['Content from PDF'])
      
      // Process each line - try to detect tabular data or create single column
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine) {
          // Try to split by common separators (tabs, multiple spaces, pipes)
          let columns = [trimmedLine]
          
          // Check for tab-separated data
          if (trimmedLine.includes('\t')) {
            columns = trimmedLine.split('\t')
          }
          // Check for pipe-separated data
          else if (trimmedLine.includes('|')) {
            columns = trimmedLine.split('|').map(col => col.trim())
          }
          // Check for multiple spaces (potential table)
          else if (trimmedLine.match(/\s{3,}/)) {
            columns = trimmedLine.split(/\s{3,}/)
          }
          
          data.push(columns)
        }
      }

      // Add watermark for free users
      if (!hasWatermarkFreeAccess) {
        data.push([])
        data.push(['Converted with QuikPDF Pro - Upgrade for watermark-free conversions'])
      }

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      
      // Set column widths
      const columnWidths = []
      for (let i = 0; i < Math.max(...data.map(row => row.length)); i++) {
        const maxLength = Math.max(...data.map(row => (row[i] || '').toString().length))
        columnWidths.push({ wch: Math.min(50, Math.max(10, maxLength)) })
      }
      worksheet['!cols'] = columnWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "PDF Content")
      
      // Add metadata
      workbook.Props = {
        Title: file.name.replace('.pdf', '.xlsx'),
        Subject: "Converted from PDF",
        Author: "QuikPDF Pro",
        CreatedDate: new Date()
      }

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true
      })

      // Return the Excel document
      return new NextResponse(excelBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.xlsx')}"`,
          'Content-Length': excelBuffer.length.toString(),
        },
      })

    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError)
      return NextResponse.json({ 
        error: "Failed to parse PDF content. The file might be corrupted or password-protected." 
      }, { status: 400 })
    }

  } catch (error) {
    console.error("PDF to Excel conversion error:", error)
    
    return NextResponse.json({ 
      error: "Internal server error during conversion" 
    }, { status: 500 })
  }
}
