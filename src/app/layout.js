import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from '../components/Providers'
import PWAInstallPrompt from '../components/PWAInstallPrompt'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  title: 'e7.chat - open-source ChatGPT alternative',
  description: 'The open-source alternative to ChatGPT',
  manifest: '/manifest.json',
  themeColor: '#1a1e24',
  viewport:
    'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'e7.chat',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/logo-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a1e24" />
        <meta name="msapplication-TileColor" content="#1a1e24" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes"
        />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="e7.chat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="e7.chat" />
        <meta name="msapplication-starturl" content="/" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
