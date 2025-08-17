import React from 'react';

const SubscriptionAgreement = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
      <h1 className="text-4xl font-bold mb-8 text-center">Subscription Agreement</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            This Subscription Agreement governs your use of the premium Turbo subscription offered by 
            QuickPDF.pro ("we," "us," or "our") on quickpdf.pro (the "Site").
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Subscription Services</h2>
          <p className="text-gray-700 leading-relaxed">
            The Turbo subscription provides faster PDF processing (merge, split, compress, edit, etc.). 
            It also allows you to process files without watermarks and perform operations in unlimited quantity. 
            Access is subject to these terms and our Terms of Use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Billing and Payments</h2>
          <p className="text-gray-700 leading-relaxed">
            Subscriptions are billed monthly or annually through our payment processor, Stripe. 
            You authorize recurring payments until canceled. 
            Fees are non-refundable except where required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Cancellation</h2>
          <p className="text-gray-700 leading-relaxed">
            You may cancel at any time through your account settings. 
            Cancellation takes effect at the end of the current billing cycle.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Modifications</h2>
          <p className="text-gray-700 leading-relaxed">
            We may change subscription fees or features with 30 days' notice. 
            Continued use after changes means acceptance of new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            We may terminate your subscription for non-payment or violation of terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            For subscription questions, email: support@quickpdf.pro
          </p>
        </section>
      </div>
    </div>
  );
};

export default SubscriptionAgreement;
