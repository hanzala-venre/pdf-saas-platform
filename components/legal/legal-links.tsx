import Link from 'next/link';

interface LegalLinksProps {
  className?: string;
}

export function LegalLinks({ className = "" }: LegalLinksProps) {
  return (
    <div className={`flex flex-wrap gap-4 text-sm ${className}`}>
      <Link 
        href="/legal/privacy-policy" 
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        Privacy Policy
      </Link>
      <span className="text-gray-400">•</span>
      <Link 
        href="/legal/terms-of-use" 
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        Terms of Use
      </Link>
      <span className="text-gray-400">•</span>
      <Link 
        href="/legal/subscription-agreement" 
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        Subscription Agreement
      </Link>
    </div>
  );
}

// Component for displaying in forms where users need to accept terms
interface LegalAcceptanceProps {
  required?: boolean;
}

export function LegalAcceptance({ required = false }: LegalAcceptanceProps) {
  return (
    <div className="text-sm text-gray-600">
      By continuing, you agree to our{' '}
      <Link 
        href="/legal/terms-of-use" 
        className="text-blue-600 hover:text-blue-800 underline"
      >
        Terms of Use
      </Link>
      {' '}and{' '}
      <Link 
        href="/legal/privacy-policy" 
        className="text-blue-600 hover:text-blue-800 underline"
      >
        Privacy Policy
      </Link>
      {required && <span className="text-red-500"> *</span>}
    </div>
  );
}

export default LegalLinks;
