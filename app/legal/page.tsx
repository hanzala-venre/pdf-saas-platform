import Link from 'next/link';
import { FileText, Shield, CreditCard } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-12 pt-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Legal Documents</h1>
            <p className="text-xl text-gray-600">
              Important legal information and policies for QuikPDF users
            </p>
          </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold">Privacy Policy</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Learn how we collect, use, and protect your personal information when using our PDF processing services.
            </p>
            <Link 
              href="/legal/privacy-policy"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Read Privacy Policy
              <FileText className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <FileText className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold">Terms of Use</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Read our terms and conditions for using our PDF processing platform and services.
            </p>
            <Link 
              href="/legal/terms-of-use"
              className="inline-flex items-center text-green-600 hover:text-green-800 font-medium"
            >
              Read Terms of Use
              <FileText className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold">Subscription Agreement</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Terms and conditions for our premium subscription services and billing.
            </p>
            <Link 
              href="/legal/subscription-agreement"
              className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
            >
              Read Subscription Agreement
              <FileText className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about these legal documents or need clarification on any terms, please don't hesitate to contact us.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium">QuikPDF Legal Team</p>
            <p className="text-gray-600">For privacy-related questions, email us at: support@quickpdf.pro</p>
            <p className="text-gray-600">Subject: Legal Inquiry</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Last updated: August 17, 2025
          </p>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}

export const metadata = {
  title: 'Legal Documents - QuikPDF',
  description: 'Important legal information and policies for QuikPDF users including Privacy Policy, Terms of Use, and Subscription Agreement.',
};
