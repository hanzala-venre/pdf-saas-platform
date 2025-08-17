import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
      <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            QuickPDF.pro ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains 
            how we collect, use, and share information when you use our website at quickpdf.pro (the "Site") and 
            our PDF tools and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Uploaded Files:</strong> PDF files you upload for processing (merge, split, compress, edit, etc.) are temporarily 
                stored to provide the services.
              </p>
            </div>
            <div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Usage Data:</strong> We collect information about your interactions with the Site, such as IP address, browser 
                type, and pages visited.
              </p>
            </div>
            <div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Payment Information:</strong> For premium subscriptions, our third-party payment processor (e.g., Stripe) 
                collects payment details. We do not store this information.
              </p>
            </div>
            <div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Cookies:</strong> We use cookies to serve ads and analyze traffic via third-party services such as Google 
                AdSense.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <ul className="space-y-2 text-gray-700">
            <li>To process and provide PDF services.</li>
            <li>To manage and bill premium subscriptions.</li>
            <li>To display personalized advertisements.</li>
            <li>To improve the Site and analyze usage trends.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Data Sharing</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              <strong>Service Providers:</strong> We share data with third-party providers (e.g., hosting, payment processors, ad 
              networks).
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Aggregated Data:</strong> We may share anonymized data for analytics or marketing.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Retention</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              Uploaded PDFs are deleted immediately after processing or within 24 hours, unless required for 
              premium features.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Usage data is retained for 12 months for analytics purposes.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Choices</h2>
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed">
              You can opt out of cookies via browser settings (may affect functionality).
            </p>
            <p className="text-gray-700 leading-relaxed">
              You can cancel subscriptions anytime through your account settings.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Security</h2>
          <p className="text-gray-700 leading-relaxed">
            We use reasonable technical and organizational measures to protect your data but cannot guarantee 
            absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Third-Party Links</h2>
          <p className="text-gray-700 leading-relaxed">
            Our Site may contain links to third-party websites. We are not responsible for their privacy practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            For privacy-related questions, email us at: support@quickpdf.pro
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
