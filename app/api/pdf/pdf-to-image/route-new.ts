import { NextRequest, NextResponse } from "next/server"
import { checkWatermarkFreeAccess, consumeOneTimeCredit } from "@/lib/watermark-utils"

// FastAPI backend URL - Update this with your deployed FastAPI URL
const FASTAPI_BASE_URL = (process.env.FASTAPI_BASE_URL || "https://your-fastapi-deployment.vercel.app").replace(/\/+$/, "")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const format = formData.get("format") as string || "png"
    const dpi = parseInt(formData.get("dpi") as string || "300", 10)
    const quality = parseInt(formData.get("quality") as string || "95", 10)
    const pages = formData.get("pages") as string || null
  // Prefer server-side check like other tools (compress)
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

    // Validate format
    const validFormats = ["png", "jpeg", "jpg", "webp"]
    if (!validFormats.includes(format.toLowerCase())) {
      return NextResponse.json({ 
        error: `Invalid format. Valid formats: ${validFormats.join(", ")}` 
      }, { status: 400 })
    }

    // Validate DPI
    if (dpi < 72 || dpi > 600) {
      return NextResponse.json({ 
        error: "DPI must be between 72 and 600" 
      }, { status: 400 })
    }

    // Validate quality
    if (quality < 1 || quality > 100) {
      return NextResponse.json({ 
        error: "Quality must be between 1 and 100" 
      }, { status: 400 })
    }

    // Create FormData for FastAPI
    const fastApiFormData = new FormData()
    fastApiFormData.append("file", file)
    fastApiFormData.append("format", format)
    fastApiFormData.append("dpi", dpi.toString())
    fastApiFormData.append("quality", quality.toString())
  fastApiFormData.append("has_watermark_free_access", hasWatermarkFreeAccess.toString())
    
    if (pages) {
      fastApiFormData.append("pages", pages)
    }

    // Call FastAPI backend
    const response = await fetch(`${FASTAPI_BASE_URL}/api/convert/pdf-to-images`, {
      method: "POST",
      body: fastApiFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Conversion failed" }))
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || "Conversion failed" 
      }, { status: response.status })
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer()

    // Pass through content-type and content-disposition for single image vs ZIP
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition') || 'attachment; filename="converted"'

    // If using one-time access, consume the credit immediately after successful operation
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Content-Length': fileBuffer.byteLength.toString(),
    }
    
    if (accessStatus.shouldConsumeCredit) {
      await consumeOneTimeCredit(request)
      headers['x-one-time-credit-consumed'] = 'true'
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("PDF to Images conversion error:", error)
    
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
