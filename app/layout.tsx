import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// Initialize background services on server-side only once
if (typeof window === 'undefined' && !(global as any).backgroundServicesInitialized) {
  (global as any).backgroundServicesInitialized = true;
  import('../lib/worker-startup').then(() => {
    console.log('Background services initialization module loaded');
  });
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IndexNow Pro',
  description: 'Professional URL indexing automation platform for Google Search Console',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}