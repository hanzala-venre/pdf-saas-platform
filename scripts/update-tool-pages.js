#!/usr/bin/env node

/**
 * Script to update all PDF tool pages to use the new credit consumption system
 * This converts from the old time-based one-time payment to credit-based system
 */

const fs = require('fs')
const path = require('path')

const toolDirectories = [
  'split',
  'react-editor', 
  'pdf-to-word',
  'rearrange',
  'pdf-to-powerpoint',
  'pdf-to-image',
  'image-to-pdf'
]

const baseDir = path.join(__dirname, '..', 'app', 'tools')

function updateToolPage(toolDir) {
  const filePath = path.join(baseDir, toolDir, 'page.tsx')
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${toolDir} - file not found`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')
  
  // Update imports
  content = content.replace(
    /import { useOneTimePayment } from "@\/hooks\/use-one-time-payment"/g,
    'import { usePDFToolAccess } from "@/hooks/use-pdf-tool-access"'
  )
  
  // Update hook usage
  content = content.replace(
    /const { hasOneTimeAccess } = useOneTimePayment\(\)\s*\n\s*const isPaidUser = subscription\?\.isPaidUser \|\| false\s*\n\s*const hasWatermarkFreeAccess = isPaidUser \|\| hasOneTimeAccess \|\| false/g,
    `const toolAccess = usePDFToolAccess()
  
  const { 
    hasOneTimeAccess, 
    hasWatermarkFreeAccess, 
    creditsRemaining, 
    apiClient 
  } = toolAccess`
  )
  
  // Update FormData approach - remove hasWatermarkFreeAccess and headers
  content = content.replace(
    /formData\.append\('hasWatermarkFreeAccess', hasWatermarkFreeAccess\.toString\(\)\)\s*\n\s*const headers: HeadersInit = {}\s*\n\s*if \(hasOneTimeAccess\) {\s*\n\s*headers\['x-one-time-access'\] = 'true'\s*\n\s*}\s*\n\s*const response = await fetch\("([^"]+)", {\s*\n\s*method: "POST",\s*\n\s*headers,\s*\n\s*body: formData,\s*\n\s*}\)/g,
    'const response = await apiClient.post("$1", formData)'
  )

  fs.writeFileSync(filePath, content)
  console.log(`Updated ${toolDir}/page.tsx`)
}

// Update all tool pages
toolDirectories.forEach(updateToolPage)

console.log('All tool pages updated successfully!')
