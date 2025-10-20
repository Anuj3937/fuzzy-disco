// src/app/layout.tsx
// Wraps the entire application with necessary providers.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Your global styles
import { Toaster } from "@/components/ui/toaster"; // For showing notifications
import { cn } from "@/lib/utils"; // Utility for class names
import { AuthProvider } from "@/components/auth/AuthProvider"; // Handles user login state
import RegisterSW from "@/components/RegisterSW"; // For Progressive Web App features
import { TranslationProvider } from "@/context/TranslationContext"; // <-- IMPORT the new provider

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Metadata for the site (like title, description for SEO)
export const metadata: Metadata = {
  title: "Shiksha Setu",
  description: "A revolutionary learning platform for students, teachers, and parents.",
  manifest: "/manifest.webmanifest",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children, // Represents the page content being displayed
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA and Font related meta tags */}
        <meta name="application-name" content="Shiksha Setu" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Shiksha Setu" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {/* Wrap everything inside AuthProvider for login state */}
        <AuthProvider>
          {/* Wrap everything inside TranslationProvider for language state */}
          <TranslationProvider> {/* <-- WRAP HERE */}
            {children} {/* Your page content will be rendered here */}
            <Toaster /> {/* Component to display pop-up messages */}
            <RegisterSW /> {/* Component to register the PWA service worker */}
          </TranslationProvider> {/* <-- END WRAP */}
        </AuthProvider>
      </body>
    </html>
  );
}