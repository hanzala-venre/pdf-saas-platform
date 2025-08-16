/**
 * PDF Tool Access Management
 * Handles one-time payment credit consumption and access control
 */

export interface PDFToolResponse {
  success: boolean
  data?: any
  shouldConsumeCredit?: boolean
  error?: string
}

/**
 * Wrapper for PDF tool API calls that handles credit consumption
 */
export async function makePDFToolRequest(
  url: string,
  formData: FormData,
  hasOneTimeAccess: boolean,
  purchaseId?: string,
  onCreditConsumed?: () => void
): Promise<Response> {
  try {
    // Add headers to indicate one-time access status and purchase ID
    const headers: HeadersInit = {}
    if (hasOneTimeAccess) {
      headers['X-One-Time-Access'] = 'true'
      if (purchaseId) {
        headers['X-Purchase-Id'] = purchaseId
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers
    })

    // Check if a credit was consumed on the server side
    if (response.ok && response.headers.get('X-One-Time-Credit-Consumed') === 'true') {
      onCreditConsumed?.()
      console.log('One-time credit was consumed on server side')
    }

    return response
  } catch (error) {
    console.error('Error making PDF tool request:', error)
    throw error
  }
}

/**
 * Enhanced fetch wrapper for PDF operations with automatic credit management
 */
export class PDFToolAPI {
  private hasOneTimeAccess: boolean
  private purchaseId?: string
  private onCreditConsumed?: () => void

  constructor(hasOneTimeAccess: boolean, purchaseId?: string, onCreditConsumed?: () => void) {
    this.hasOneTimeAccess = hasOneTimeAccess
    this.purchaseId = purchaseId
    this.onCreditConsumed = onCreditConsumed
  }

  async post(url: string, formData: FormData): Promise<Response> {
    return makePDFToolRequest(url, formData, this.hasOneTimeAccess, this.purchaseId, this.onCreditConsumed)
  }

  async upload(url: string, files: File[], additionalData?: Record<string, string>): Promise<Response> {
    const formData = new FormData()
    
    // Add files
    files.forEach((file, index) => {
      formData.append(`file${index}`, file)
    })

    // Add additional form data
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return this.post(url, formData)
  }
}
