import { FileText } from "lucide-react"
import Link from "next/link"
import Image from "next/image";
import logoImage from "@/assets/logo.png"
export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl mb-4"
            >
              <Image
                src={logoImage}
                alt="Logo"
                width={100}
                height={32}
                />
            </Link>
            <p className="text-gray-400 mb-4">
              Professional PDF tools for modern workflows. Fast, secure, and
              reliable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Tools</h3>
            <div className="space-y-2 text-gray-400">
              <Link
                href="/tools/merge"
                className="block hover:text-white transition-colors"
              >
                Merge PDFs
              </Link>
              <Link
                href="/tools/split"
                className="block hover:text-white transition-colors"
              >
                Split PDFs
              </Link>
              <Link
                href="/tools/image-to-pdf"
                className="block hover:text-white transition-colors"
              >
                Image to PDF
              </Link>
              <Link
                href="/tools/pdf-to-image"
                className="block hover:text-white transition-colors"
              >
                PDF to Image
              </Link>
              <Link
                href="/tools/compress"
                className="block hover:text-white transition-colors"
              >
                Compress PDFs
              </Link>
              <Link
                href="/tools/react-editor"
                className="block hover:text-white transition-colors"
              >
                PDF Editor
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <div className="space-y-2 text-gray-400">
              <Link
                href="/pricing"
                className="block hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="block hover:text-white transition-colors"
              >
                Contact
              </Link>
              <Link
                href="/blog"
                className="block hover:text-white transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <div className="space-y-2 text-gray-400">
              <Link
                href="/privacy"
                className="block hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="block hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/security"
                className="block hover:text-white transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 QuikPDF. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
