import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts, PDFName } from "pdf-lib"
import { PDFOperationService } from "@/lib/pdf-operation-service"

export async function POST(request: NextRequest) {
  const service = new PDFOperationService(request, {
    operationType: 'COMPRESS',
    minFiles: 1,
    maxFiles: 1,
    allowSingleFile: true
  })

  return service.handleOperation(async (files, accessStatus, formData) => {
    const file = files[0]
    const quality = formData.get("quality") as string || "medium"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const originalSize = file.size
    const arrayBuffer = await file.arrayBuffer()

    // Use enhanced compression with watermark-free access consideration
    const compressedPdfBytes = await enhancedPDFCompression(
      arrayBuffer, 
      quality, 
      accessStatus.hasWatermarkFreeAccess
    )
    const compressedSize = compressedPdfBytes.length

    // Calculate compression ratio
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1)

    return NextResponse.json({
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      data: Buffer.from(compressedPdfBytes).toString("base64"),
      message: `PDF compressed successfully. Reduced size by ${compressionRatio}%`
    })
  })
}

// Enhanced compression with simulated quality-based optimization
async function enhancedPDFCompression(arrayBuffer: ArrayBuffer, quality: string, isPaidUser: boolean): Promise<Uint8Array> {
  // Apply multiple compression passes for better results
  let compressedBytes = await qualityBasedCompression(arrayBuffer, quality, isPaidUser)
  
  // Apply additional optimization based on quality level
  if (quality === "maximum" || quality === "low") {
    compressedBytes = await aggressiveCompression(compressedBytes, quality)
  }
  
  return compressedBytes
}

// Quality-based compression with realistic size reduction
async function qualityBasedCompression(arrayBuffer: ArrayBuffer, quality: string, isPaidUser: boolean): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  const settings = getCompressionSettings(quality)
  
  // Clear metadata aggressively
  pdfDoc.setTitle("")
  pdfDoc.setAuthor("")
  pdfDoc.setSubject("")
  pdfDoc.setKeywords([])
  pdfDoc.setCreator("Quikpdf.pro")
  pdfDoc.setProducer(`Quikpdf.pro - ${quality} compression`)
  
  // Apply page optimizations
  await optimizePages(pdfDoc, settings)
  
  // Remove unnecessary content based on quality
  if (settings.removeAnnotations) {
    removeAnnotations(pdfDoc)
  }
  
  // Add watermark for free users using the service method
  await PDFOperationService.addWatermarkIfNeeded(pdfDoc, isPaidUser)
  
  // Save with optimized settings
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: settings.objectsPerTick,
    updateFieldAppearances: false,
  })

  return pdfBytes
}

// Aggressive compression for maximum size reduction
async function aggressiveCompression(pdfBytes: Uint8Array, quality: string): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const settings = getCompressionSettings(quality)
    
    // Apply aggressive page scaling
    const pages = pdfDoc.getPages()
    for (const page of pages) {
      const { width, height } = page.getSize()
      
      // More aggressive scaling for maximum compression
      const maxDimension = quality === "maximum" ? 400 : 600
      const scale = Math.min(maxDimension / Math.max(width, height), 1)
      
      if (scale < 1) {
        page.scale(scale, scale)
      }
      
      // Remove optional page elements
      const pageNode = page.node
      
      // Remove thumbnails and annotations more aggressively
      if (pageNode.has(PDFName.of('Thumb'))) {
        pageNode.delete(PDFName.of('Thumb'))
      }
      
      if (pageNode.has(PDFName.of('Annots'))) {
        pageNode.delete(PDFName.of('Annots'))
      }
    }
    
    // Save with maximum compression
    return await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: settings.objectsPerTick,
      updateFieldAppearances: false,
    })
  } catch (error) {
    console.warn("Aggressive compression failed, returning original:", error)
    return pdfBytes
  }
}

// Optimize pages for compression
async function optimizePages(pdfDoc: PDFDocument, settings: any) {
  const pages = pdfDoc.getPages()
  
  for (const page of pages) {
    const pageNode = page.node
    
    // Remove thumbnails to save space
    if (pageNode.has(PDFName.of('Thumb'))) {
      pageNode.delete(PDFName.of('Thumb'))
    }
    
    // Apply page-level optimizations based on quality
    if (settings.optimizeImages) {
      // Optimize embedded images (simplified approach)
      try {
        const resources = page.node.lookup(PDFName.of('Resources'))
        if (resources) {
          // Image optimization would be implemented here
          // For now, we skip complex image processing
        }
      } catch (error) {
        // Ignore image optimization errors
      }
    }
  }
}

// Remove annotations from the document
function removeAnnotations(pdfDoc: PDFDocument) {
  const pages = pdfDoc.getPages()
  
  for (const page of pages) {
    const pageNode = page.node
    if (pageNode.has(PDFName.of('Annots'))) {
      pageNode.delete(PDFName.of('Annots'))
    }
  }
}

// Get compression settings based on quality level
function getCompressionSettings(quality: string) {
  const settings = {
    low: {
      objectsPerTick: 50,
      removeAnnotations: true,
      optimizeImages: true,
      aggressiveMetadataRemoval: true
    },
    medium: {
      objectsPerTick: 100,
      removeAnnotations: true,
      optimizeImages: true,
      aggressiveMetadataRemoval: false
    },
    high: {
      objectsPerTick: 200,
      removeAnnotations: false,
      optimizeImages: false,
      aggressiveMetadataRemoval: false
    },
    maximum: {
      objectsPerTick: 25,
      removeAnnotations: true,
      optimizeImages: true,
      aggressiveMetadataRemoval: true
    }
  }
  
  return settings[quality as keyof typeof settings] || settings.medium
}
