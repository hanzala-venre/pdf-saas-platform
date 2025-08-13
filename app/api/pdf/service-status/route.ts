import { NextResponse } from "next/server"

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8001"

export async function GET() {
  try {
    // Test connection to FastAPI service
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`${FASTAPI_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      return NextResponse.json({
        status: "online",
        message: "PDF conversion service is available",
        service_url: FASTAPI_BASE_URL
      })
    } else {
      return NextResponse.json({
        status: "degraded",
        message: `Service returned ${response.status}`,
        service_url: FASTAPI_BASE_URL
      })
    }
    
  } catch (error) {
    console.error("Service health check failed:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json({
      status: "offline",
      message: "PDF conversion service is currently unavailable",
      error: errorMessage,
      service_url: FASTAPI_BASE_URL,
      alternatives: [
        "Use LibreOffice (File → Export as PowerPoint)",
        "Try online converters like SmallPDF",
        "Use Adobe Acrobat Pro export feature"
      ]
    })
  }
}
