import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GlobalWebSocketProvider from '@/components/GlobalWebSocketProvider'

// Initialize background services on server-side only once
if (typeof window === 'undefined' && !(global as any).backgroundServicesInitialized) {
  (global as any).backgroundServicesInitialized = true;
  import('../lib/worker-startup').then(({ workerStartup }) => {
    workerStartup.initialize().then(() => {
      console.log('IndexNow Pro background services initialized successfully');
    }).catch((error) => {
      console.error('Failed to initialize background services:', error);
    });
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
        <GlobalWebSocketProvider>
          {children}
        </GlobalWebSocketProvider>
      </body>
    </html>
  )
}