import { Metadata } from 'next'
import PricingPageContent from './components/PricingPageContent'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'

export const metadata: Metadata = {
  title: 'Pricing - IndexNow: Rank Tracker',
  description: 'Fair, transparent pricing built to grow with you. No hidden fees. No confusing credits. Just straightforward plans that scale when you need them.',
  keywords: 'rank tracker pricing, SEO tool pricing, keyword tracking plans, affordable rank tracking, transparent pricing',
  openGraph: {
    title: 'Pricing - IndexNow: Rank Tracker',
    description: 'Fair, transparent pricing built to grow with you. Pay for rank tracking, not for bloat.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing - IndexNow: Rank Tracker',
    description: 'Fair, transparent pricing built to grow with you. Pay for rank tracking, not for bloat.',
  }
}

export default function PricingPage() {
  return (
    <ClientOnlyWrapper fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Pricing...</p>
        </div>
      </div>
    }>
      <PricingPageContent />
    </ClientOnlyWrapper>
  )
}