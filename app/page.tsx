import { Metadata } from 'next'
import LandingPage from './components/LandingPage'

export const metadata: Metadata = {
  title: 'IndexNow Pro - Professional Google URL Indexing Automation',
  description: 'Stop waiting for Google to find your content. IndexNow Pro automates URL indexing with Google Search Console API. Get your pages indexed instantly with enterprise-grade reliability.',
  keywords: 'Google indexing, URL indexing, SEO automation, Google Search Console, instant indexing, RankMath alternative',
  openGraph: {
    title: 'IndexNow Pro - Professional Google URL Indexing Automation',
    description: 'Stop waiting for Google to find your content. IndexNow Pro automates URL indexing with Google Search Console API. Get your pages indexed instantly with enterprise-grade reliability.',
    type: 'website',
    images: [{
      url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-black.png',
      width: 1200,
      height: 630,
      alt: 'IndexNow Pro - Professional URL Indexing'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IndexNow Pro - Professional Google URL Indexing Automation',
    description: 'Stop waiting for Google to find your content. IndexNow Pro automates URL indexing with Google Search Console API.',
  }
}

export default function HomePage() {
  return <LandingPage />
}