import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";

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
  title: "Ententi - Learn Languages Through Reading",
  description: "Learn any language by reading content you love, perfectly adapted to your reading level with instant translations",
  manifest: "/manifest.json",
  icons: {
    icon: '/globe.svg',
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
      </body>
    </html>
  );
}
