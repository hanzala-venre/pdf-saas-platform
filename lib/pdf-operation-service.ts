import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { Session } from "next-auth"
import { checkWatermarkFreeAccess } from "@/lib/watermark-utils"

export interface PDFProcessResult {
  success: boolean
  data?: any
  error?: string
  usageInfo?: any
}

export interface PDFOperationConfig {
  operationType: 'MERGE' | 'SPLIT' | 'COMPRESS' | 'REACT_EDIT'
  minFiles?: number
  maxFiles?: number
  allowSingleFile?: boolean
}

/**
 * Base PDF operation handler that manages authentication, watermarking, and usage tracking
 */
export class PDFOperationService {
  private request: NextRequest
  private config: PDFOperationConfig

  constructor(request: NextRequest, config: PDFOperationConfig) {
    this.request = request
    this.config = config
  }

  /**
   * Handle the common PDF operation flow
   */
  async handleOperation(processFunction: (files: File[], accessStatus: any, formData: FormData) => Promise<any>): Promise<NextResponse> {
    try {
      // Check watermark-free access (supports both subscription and one-time payment)
      const accessStatus = await checkWatermarkFreeAccess(this.request)
      const session = await getServerSession(authOptions) as Session | null

      // Extract and validate files (this also extracts the formData)
      const extractResult = await this.extractFilesAndFormData()
      if (!extractResult.success) {
        return NextResponse.json({ error: extractResult.error }, { status: 400 })
      }

      // Process the PDF operation
      const result = await processFunction(extractResult.files!, accessStatus, extractResult.formData!)

      // If the operation was successful and we used one-time access, consume the credit immediately
      if (result.ok && accessStatus.shouldConsumeCredit) {
        await this.consumeOneTimeCredit()
        // Add a header to signal the frontend that credit was consumed
        result.headers.set('X-One-Time-Credit-Consumed', 'true')
      }

      // Log the operation (only for logged-in users)
      if (session?.user?.email && accessStatus.userId) {
        await this.logOperation(accessStatus.userId, extractResult.files!)
      }

      return result

    } catch (error) {
      console.error(`Error in ${this.config.operationType} operation:`, error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  /**
   * Extract and validate files from form data
   */
  private async extractFilesAndFormData(): Promise<{ success: boolean; files?: File[]; formData?: FormData; error?: string }> {
    const formData = await this.request.formData()
    const files: File[] = []

    for (const [key, value] of formData.entries()) {
      if ((key.startsWith('file') || key === 'file') && value instanceof File) {
        files.push(value)
      }
    }

    // Validate file count
    if (this.config.minFiles && files.length < this.config.minFiles) {
      return {
        success: false,
        error: `At least ${this.config.minFiles} PDF file${this.config.minFiles > 1 ? 's are' : ' is'} required for ${this.config.operationType.toLowerCase()}`
      }
    }

    if (this.config.maxFiles && files.length > this.config.maxFiles) {
      return {
        success: false,
        error: `Maximum ${this.config.maxFiles} PDF file${this.config.maxFiles > 1 ? 's are' : ' is'} allowed for ${this.config.operationType.toLowerCase()}`
      }
    }

    if (!this.config.allowSingleFile && files.length < 1) {
      return {
        success: false,
        error: "No PDF files provided"
      }
    }

    // Validate that all files are PDFs
    for (const file of files) {
      if (file.type !== "application/pdf") {
        return {
          success: false,
          error: `File ${file.name} is not a valid PDF`
        }
      }
    }

    return { success: true, files, formData }
  }

  /**
   * Add watermark to PDF if user doesn't have watermark-free access
   */
  static async addWatermarkIfNeeded(pdfDoc: PDFDocument, hasWatermarkFreeAccess: boolean): Promise<void> {
    if (!hasWatermarkFreeAccess) {
      await this.addWatermark(pdfDoc)
    }
  }

  /**
   * Add watermark to PDF document
   */
  static async addWatermark(pdfDoc: PDFDocument): Promise<void> {
    const siteName = "Created with Quikpdf.pro"
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    for (const page of pages) {
      const { width, height } = page.getSize()
      
      // Calculate text width to center it
      const textWidth = siteName.length * 8 // Approximate width calculation
      const centerX = (width - textWidth) / 2
      
      // Add centered watermark text at the bottom of the page
      page.drawText(siteName, {
        x: centerX,
        y: 20,
        size: 16,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.8,
      })
    }
  }

  /**
   * Consume one-time credit on the server side by invalidating the purchase ID
   */
  private async consumeOneTimeCredit(): Promise<void> {
    try {
      // Get the purchase ID from request headers or cookies
      const purchaseId = this.request.headers.get('x-purchase-id') || 
                        this.request.cookies.get('one-time-purchase-id')?.value

      if (purchaseId) {
        // Store consumed purchase ID in database to prevent reuse
        try {
          await (prisma as any).consumedOneTimePayment.create({
            data: {
              purchaseId,
              consumedAt: new Date(),
              operationType: this.config.operationType
            }
          })
        } catch (error: any) {
          // If it already exists (duplicate), that's fine - it means it was already consumed
          if (!error.message?.includes('Unique constraint') && !error.message?.includes('unique constraint')) {
            throw error
          }
        }
      }
    } catch (error) {
      console.error('Error consuming one-time credit:', error)
      // Don't throw - this shouldn't break the main operation
    }
  }

  /**
   * Log PDF operation to database
   */
  private async logOperation(userId: string, files: File[]): Promise<void> {
    try {
      await prisma.pdfOperation.create({
        data: {
          userId: userId,
          type: this.config.operationType,
          fileName: files.length === 1 ? files[0].name : `${this.config.operationType.toLowerCase()}-${files.length}-files.pdf`,
          fileSize: files.reduce((total, file) => total + file.size, 0),
          status: "COMPLETED",
        },
      })
    } catch (error) {
      console.error('Error logging PDF operation:', error)
      // Don't throw - logging should not break the main operation
    }
  }

  /**
   * Create a PDF response
   */
  static createPDFResponse(pdfBytes: Uint8Array, filename: string): NextResponse {
    // Sanitize filename to remove non-ASCII characters
    const sanitizedFilename = filename.replace(/[^\x00-\x7F]/g, "_").replace(/[<>:"/\\|?*]/g, "_")
    
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizedFilename}"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    })
  }

  /**
   * Create a JSON response for operations that return data
   */
  static createJSONResponse(data: any): NextResponse {
    return NextResponse.json({
      success: true,
      ...data
    })
  }
}
