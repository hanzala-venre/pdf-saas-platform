import type React from "react"
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@/components/analytics"
import { Suspense } from "react"
import logoImage from "@/assets/logo.png"
import faviconImage from "@/assets/favicon.ico"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "QuikPDF Pro - Professional PDF Processing & Editing Tools",
    template: "%s | QuikPDF Pro"
  },
  description: "Transform your PDFs with professional-grade tools. Merge, split, compress, convert, and edit PDFs with our advanced online platform. Fast, secure, and reliable PDF processing for businesses and individuals.",
  keywords: [
    "PDF tools",
    "PDF editor",
    "PDF converter",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to Word",
    "PDF to Excel",
    "PDF to PowerPoint",
    "PDF to image",
    "online PDF tools",
    "professional PDF processing",
    "document management",
    "PDF manipulation",
    "secure PDF tools"
  ],
  authors: [{ name: "QuikPDF Pro Team" }],
  creator: "QuikPDF Pro",
  publisher: "QuikPDF Pro",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://quikpdfpro.com",
    siteName: "QuikPDF Pro",
    title: "QuikPDF Pro - Professional PDF Processing & Editing Tools",
    description: "Transform your PDFs with professional-grade tools. Merge, split, compress, convert, and edit PDFs with our advanced online platform.",
    images: [
     
      {
        url: logoImage.src,
        width: 800,
        height: 600,
        alt: "QuikPDF Pro Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@quikpdfpro",
    creator: "@quikpdfpro",
    title: "QuikPDF Pro - Professional PDF Processing & Editing Tools",
    description: "Transform your PDFs with professional-grade tools. Merge, split, compress, convert, and edit PDFs online.",
    images: [logoImage.src],
  },
  alternates: {
    canonical: "https://quikpdfpro.com",
  },
  category: "Technology",
  classification: "PDF Tools and Document Management",
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuikPDF Pro",
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL("https://quikpdfpro.com"),
  other: {
    "msapplication-TileColor": "#2563eb",
    "theme-color": "#2563eb",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "QuikPDF Pro",
    "description": "Professional PDF processing and editing tools for businesses and individuals",
    "url": "https://quikpdfpro.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "category": "SaaS"
    },
    "featureList": [
      "PDF Merge",
      "PDF Split", 
      "PDF Compression",
      "PDF to Word Conversion",
      "PDF to Excel Conversion",
      "PDF to PowerPoint Conversion",
      "PDF to Image Conversion",
      "Advanced PDF Editor",
      "Secure Processing"
    ]
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href={faviconImage.src} />
        <link rel="apple-touch-icon" href={logoImage.src} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<div>Loading...</div>}>
            <AuthProvider>
              {children}
              <Toaster />
              <Analytics />
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
