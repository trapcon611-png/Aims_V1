import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-jakarta',
});

// ✨ NEW: Viewport configuration to lock zooming so it feels like a native app
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

// ✨ UPDATED: Added manifest link and Apple web app capabilities
export const metadata: Metadata = {
  title: 'AIMS Institute Portal',
  description: 'Academic Management System',
  manifest: "/manifest.json",
  // ✨ NEW: Force Apple to use the white-background JPG
  icons: {
    apple: "/logo-v2.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AIMS SOC",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} font-sans`}>
      <body className="antialiased bg-[#F0F5FA] text-slate-800">
        {children}
      </body>
    </html>
  );
}