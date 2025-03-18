import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SavedArticlesProvider } from "@/context/SavedArticlesContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SavedArticlesProvider>
            <Navbar />
            <main className="min-h-screen pt-16">
              {children}
            </main>
          </SavedArticlesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
