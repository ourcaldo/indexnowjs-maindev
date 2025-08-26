import { Metadata } from 'next'
import LandingPage from './components/LandingPage'
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper'

export const metadata: Metadata = {
  title: 'IndexNow Studio - Professional Rank Tracking Made Simple',
  description: 'Track your keyword rankings with precision. IndexNow Studio provides powerful rank tracking tools that are simple yet comprehensive for SEO professionals and digital marketers.',
  keywords: 'rank tracking, keyword ranking, SEO tracking, SERP monitoring, rank tracker, keyword position, SEO analytics',
  openGraph: {
    title: 'IndexNow Studio - Professional Rank Tracking Made Simple',
    description: 'Track your keyword rankings with precision. IndexNow Studio provides powerful rank tracking tools that are simple yet comprehensive for SEO professionals.',
    type: 'website',
    images: [{
      url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-black.png',
      width: 1200,
      height: 630,
      alt: 'IndexNow Studio - Professional Rank Tracking'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndexNow Studio - Professional Rank Tracking Made Simple',
    description: 'Track your keyword rankings with precision. IndexNow Studio provides powerful rank tracking tools that are simple yet comprehensive.',
  }
}

export default function HomePage() {
  return (
    <ClientOnlyWrapper fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IndexNow Rank Tracker...</p>
        </div>
      </div>
    }>
      <LandingPage />
    </ClientOnlyWrapper>
  )
}