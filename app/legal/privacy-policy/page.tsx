import PrivacyPolicy from '@/components/legal/privacy-policy';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PrivacyPolicy />
      <Footer />
    </div>
  );
}

export const metadata = {
  title: 'Privacy Policy - QuikPDF',
  description: 'QuikPDF Privacy Policy - Learn how we collect, use, and protect your personal information when using our PDF processing services.',
};
