import SubscriptionAgreement from '@/components/legal/subscription-agreement';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function SubscriptionAgreementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SubscriptionAgreement />
      <Footer />
    </div>
  );
}

export const metadata = {
  title: 'Subscription Agreement - QuikPDF',
  description: 'QuikPDF Subscription Agreement - Terms and conditions for our premium subscription services and billing.',
};
