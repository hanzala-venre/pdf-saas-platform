import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess, consumeOneTimeCredit } from "@/lib/watermark-utils"

// FastAPI backend URL
const FASTAPI_BASE_URL = (process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "")

export async function POST(request: NextRequest) {
  try {
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

    // Validate file size (very high limit for unlimited usage)
    const maxSize = 1024 * 1024 * 1024 // 1GB - effectively unlimited for practical use
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${maxSize / (1024 * 1024 * 1024)}GB` 
      }, { status: 413 })
    }

    // Create FormData for FastAPI
  const fastApiFormData = new FormData()
  fastApiFormData.append("file", file)
  fastApiFormData.append("has_watermark_free_access", hasWatermarkFreeAccess.toString())

    // Call FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/convert/pdf-to-word`, {
      method: "POST",
      body: fastApiFormData,
      headers: {
        // Don't set Content-Type for FormData, let fetch set it with boundary
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Conversion failed" }))
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || "Conversion failed" 
      }, { status: response.status })
    }

    // Stream back with backend headers
    const arrayBuffer = await response.arrayBuffer()
    const headers = new Headers()
    const ct = response.headers.get('content-type')
    const cd = response.headers.get('content-disposition')
    if (ct) headers.set('content-type', ct)
    if (cd) headers.set('content-disposition', cd)
    headers.set('content-length', String(arrayBuffer.byteLength))
    
    // If using one-time access, consume the credit immediately after successful operation
    if (accessStatus.shouldConsumeCredit) {
      await consumeOneTimeCredit(request)
      headers.set('x-one-time-credit-consumed', 'true')
    }
    
    return new NextResponse(arrayBuffer, { status: 200, headers })

  } catch (error) {
    console.error("PDF to Word conversion error:", error)
    
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
