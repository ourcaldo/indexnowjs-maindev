import { Metadata } from 'next'
import LandingPage from './components/LandingPage'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'

export const metadata: Metadata = {
  title: 'IndexNow: Rank Tracker - Rank tracking, minus the bloat',
  description: 'Simple. Accurate. Affordable. IndexNow focuses on one job and does it right: precise keyword rankings with clean reports and fair pricing. No tool fatigue. No surprise fees.',
  keywords: 'rank tracker, keyword ranking, SEO tracking, SERP monitoring, local rank tracking, mobile rank tracking, keyword position tracker, SEO analytics, rank tracking tool',
  openGraph: {
    title: 'IndexNow: Rank Tracker - Rank tracking, minus the bloat',
    description: 'Know where you rank—any device, any location—without the headache. Built for SEO professionals who want accuracy without complexity.',
    type: 'website',
    images: [{
      url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-black.png',
      width: 1200,
      height: 630,
      alt: 'IndexNow: Rank Tracker - Professional Rank Tracking Made Simple'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndexNow: Rank Tracker - Rank tracking, minus the bloat',
    description: 'Simple. Accurate. Affordable. Precise keyword rankings with clean reports and fair pricing.',
  }
}

export default function HomePage() {
  return (
    <ClientOnlyWrapper fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IndexNow: Rank Tracker...</p>
        </div>
      </div>
    }>
      <LandingPage />
    </ClientOnlyWrapper>
  )
}