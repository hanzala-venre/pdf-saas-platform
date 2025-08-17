import React from 'react';

const TermsOfUse = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
      <h1 className="text-4xl font-bold mb-8 text-center">Terms of Use</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Welcome to QuickPDF.pro ("we," "us," or "our"). By accessing or using quickpdf.pro (the "Site") or any 
            of our services, you agree to be bound by these Terms of Use ("Terms"). If you do not agree, please do 
            not use the Site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Use of the Site</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">You must be at least 18 years old to use the Site.</p>
            <p className="text-gray-700 leading-relaxed">You agree to use the Site only for lawful purposes.</p>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for ensuring that uploaded files do not violate intellectual property rights or contain 
              illegal content.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Services</h2>
          <p className="text-gray-700 leading-relaxed">
            QuickPDF.pro provides free PDF tools (merge, split, compress, edit, etc.) and premium "Turbo" 
            subscriptions. We may modify or discontinue any service at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Content</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">You retain ownership of any PDF files you upload ("User Content").</p>
            <p className="text-gray-700 leading-relaxed">
              By uploading, you grant us a limited license to process the files solely to provide our services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We may delete User Content after processing or if it violates these Terms.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Subscriptions and Payments</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">Premium Turbo processing is available via subscription.</p>
            <p className="text-gray-700 leading-relaxed">Payments are handled by third-party providers (e.g., Stripe).</p>
            <p className="text-gray-700 leading-relaxed">
              Subscriptions auto-renew until canceled. Refunds follow our Subscription Agreement.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Advertisements</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">Our Site may display third-party ads. We are not responsible for their content.</p>
            <p className="text-gray-700 leading-relaxed">Clicking ads is at your own risk.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              The Site and its content (excluding User Content) are owned by QuickPDF.pro and protected by 
              copyright law.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You may not copy, modify, or distribute any part of the Site without written permission.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">The Site is provided "as is" without warranties of any kind.</p>
            <p className="text-gray-700 leading-relaxed">We are not liable for damages, including data loss or interruptions.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">We may suspend or terminate your access for violations of these Terms.</p>
            <p className="text-gray-700 leading-relaxed">You may stop using the Site anytime.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms are governed by the laws of Delaware, USA. Disputes will be resolved in Delaware 
            courts.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            For questions, email: support@quickpdf.pro
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfUse;
