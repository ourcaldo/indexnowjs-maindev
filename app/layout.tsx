import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/contexts/AuthContext'

// Initialize background services on server-side only once
if (typeof window === 'undefined' && !(global as any).backgroundServicesInitialized) {
  (global as any).backgroundServicesInitialized = true;
  import('../lib/job-management/worker-startup').then(({ workerStartup }) => {
    workerStartup.initialize().then(() => {
      console.log('IndexNow Studio background services initialized successfully');
    }).catch((error) => {
      console.error('Failed to initialize background services:', error);
    });
  });
}

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IndexNow Studio',
  description: 'Professional rank tracking made simple. Precise keyword rankings with clean reports and fair pricing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}