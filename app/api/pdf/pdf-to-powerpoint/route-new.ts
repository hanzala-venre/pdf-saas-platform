import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess } from "@/lib/watermark-utils"

// FastAPI backend URL
const FASTAPI_BASE_URL = (process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "")

export async function POST(request: NextRequest) {
  try {
  const formData = await request.formData()
  const file = formData.get("file") as File
  const slidesPerPage = parseInt(formData.get("slidesPerPage") as string || "1", 10)
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

    // Create FormData for FastAPI
  const fastApiFormData = new FormData()
  fastApiFormData.append("file", file)
  fastApiFormData.append("slides_per_page", slidesPerPage.toString())
  fastApiFormData.append("has_watermark_free_access", hasWatermarkFreeAccess.toString())

    // Call FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/convert/pdf-to-powerpoint`, {
      method: "POST",
      body: fastApiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Conversion failed" }))
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || "Conversion failed" 
      }, { status: response.status })
    }

    const arrayBuffer = await response.arrayBuffer()
    const headers = new Headers()
    const ct = response.headers.get('content-type')
    const cd = response.headers.get('content-disposition')
    if (ct) headers.set('content-type', ct)
    if (cd) headers.set('content-disposition', cd)
    headers.set('content-length', String(arrayBuffer.byteLength))
    return new NextResponse(arrayBuffer, { status: 200, headers })

  } catch (error) {
    console.error("PDF to PowerPoint conversion error:", error)
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({ 
        error: "Unable to connect to conversion service. Please try again later." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: "Internal server error during conversion" 
    }, { status: 500 })
  }
}
