import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import { Footer } from '@/components/sections/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { MotionProvider } from '@/components/ui/MotionProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { SITE } from '@/lib/constants'

import './globals.css'

/**
 * Two faces, one job each.
 *
 * Inter carries human language — headlines, copy, buttons. JetBrains Mono carries machine
 * artifacts — URLs, byte counts, durations, resolutions, format ids. The product is about
 * turning a link into a file, and the type says so.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'AllDown — Download TikTok, Instagram & YouTube Videos Free',
    template: '%s | AllDown',
  },
  description: SITE.description,
  keywords: [
    'tiktok downloader',
    'instagram video downloader',
    'youtube downloader',
    'social media downloader',
    'video download online',
    'tiktok no watermark',
    'reels downloader',
    'twitter video downloader',
  ],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: 'AllDown — All-in-One Social Media Downloader',
    description: 'Download videos from 12 platforms instantly. Free, fast, no signup.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AllDown' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AllDown — Download Any Social Media Video Free',
    description: 'TikTok, Instagram, YouTube, X and more. No watermark. HD quality.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport: Viewport = {
  themeColor: '#080810',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>

        <MotionProvider>
          <ToastProvider>
            <Navbar />
            <main id="main">{children}</main>
            <Footer />
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  )
}
