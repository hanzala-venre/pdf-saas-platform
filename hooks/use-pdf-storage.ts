import { useEffect, useState } from 'react'

export interface PDFStorageData {
  [key: string]: any
}

export function usePDFStorage(storageKey: string, initialValue: any = null) {
  const [value, setValue] = useState<any>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load value from localStorage on mount
  useEffect(() => {
    try {
      const savedValue = localStorage.getItem(storageKey)
      if (savedValue !== null) {
        setValue(JSON.parse(savedValue))
      }
    } catch (error) {
      console.error(`Error loading ${storageKey} from localStorage:`, error)
      localStorage.removeItem(storageKey)
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey])

  // Save value to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        if (value === null || value === undefined) {
          localStorage.removeItem(storageKey)
        } else {
          localStorage.setItem(storageKey, JSON.stringify(value))
        }
      } catch (error) {
        console.error(`Error saving ${storageKey} to localStorage:`, error)
      }
    }
  }, [storageKey, value, isLoaded])

  const clearValue = () => {
    setValue(initialValue)
    localStorage.removeItem(storageKey)
  }

  return [value, setValue, clearValue, isLoaded] as const
}

// Hook for managing multiple PDF storage keys
export function usePDFMultiStorage(keys: string[]) {
  const clearAll = () => {
    keys.forEach(key => {
      localStorage.removeItem(key)
    })
  }

  return { clearAll }
}

// Utility functions for PDF file operations
export const PDFStorageUtils = {
  // Clean up old blob URLs to prevent memory leaks
  cleanupBlobUrls: (urls: string[]) => {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
  },

  // Create blob URL from base64 data
  createBlobFromBase64: (base64Data: string, filename: string): string => {
    try {
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Error creating blob from base64:', error)
      return '#'
    }
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Validate PDF file
  validatePDFFile: (file: File): boolean => {
    return file.type === 'application/pdf' && file.size > 0
  }
}
