import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import { Analytics } from '@vercel/analytics/react';

// Import the new handler component
import FeedbackHandler from '@/components/layout/FeedbackHandler';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ententi.com'),
  title: "Ententi - Learn Languages Through Reading",
  description: "Learn any language by reading content you love, perfectly adapted to your reading level with instant translations",
  manifest: "/manifest.json",
  icons: {
    icon: '/globe.svg',
  },
  openGraph: {
    title: "Ententi - Learn Languages Through Reading",
    description: "Learn any language by reading content you love, perfectly adapted to your reading level with instant translations",
    url: 'https://ententi.com',
    siteName: 'Ententi',
    images: [
      {
        url: '/og_image.png',
        width: 1200,
        height: 630,
        alt: 'Ententi - Learn Languages Through Reading',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ententi - Learn Languages Through Reading',
    description: 'Learn any language by reading content you love, perfectly adapted to your reading level with instant translations',
    images: ['/og_image.png'],
    creator: '@ententi',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // State management is moved to FeedbackHandler

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <ServiceWorkerRegistrar />
          {/* Render the client-side feedback handler */}
          <FeedbackHandler />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
