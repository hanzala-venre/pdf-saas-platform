import TermsOfUse from '@/components/legal/terms-of-use';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TermsOfUse />
      <Footer />
    </div>
  );
}

export const metadata = {
  title: 'Terms of Use - QuikPDF',
  description: 'QuikPDF Terms of Use - Read our terms and conditions for using our PDF processing platform and services.',
};
