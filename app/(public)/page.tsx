import { Metadata } from 'next'
import LandingPage from '@/app/components/LandingPage'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'

export const metadata: Metadata = {
  title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
  description: 'Simple. Accurate. Affordable. IndexNow focuses on one job and does it right: precise keyword rankings with clean reports and fair pricing. No tool fatigue. No surprise fees.',
  keywords: 'rank tracker, keyword ranking, SEO tracking, SERP monitoring, local rank tracking, mobile rank tracking, keyword position tracker, SEO analytics, rank tracking tool',
  openGraph: {
    title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
    description: 'Know where you rank—any device, any location—without the headache. Built for SEO professionals who want accuracy without complexity.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndexNow Studio - Rank Tracking Made Simple for Smarter SEO Decisions',
    description: 'Simple. Accurate. Affordable. Precise keyword rankings with clean reports and fair pricing.',
  }
}

export default function HomePage() {
  return (
    <ClientOnlyWrapper fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IndexNow Studio...</p>
        </div>
      </div>
    }>
      <LandingPage />
    </ClientOnlyWrapper>
  )
}