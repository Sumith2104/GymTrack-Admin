import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'GymTrack Central Admin',
  description: 'Super Admin dashboard for GymTrack',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background text-foreground relative overflow-x-hidden">
        {/* Animated Background Layers */}
        <div className="fixed inset-0 z-[-1] bg-background pointer-events-none">
          {/* Deep Grid Overlay */}
          <div className="absolute inset-0 bg-grid-white opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-0">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
