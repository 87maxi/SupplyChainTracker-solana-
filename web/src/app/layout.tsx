import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { SolanaWalletClientProvider } from '@/components/SolanaWalletClientProvider';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { NotificationContainer } from '@/components/ui/NotificationContainer';
import { RequireWallet } from '@/components/auth/RequireWallet';
import DiagnosticRunner from '@/components/diagnostics/DiagnosticRunner';
import DebugComponent from '@/components/diagnostics/DebugComponent';
import { SolanaEventProvider } from '@/lib/solana/event-provider';
import QueryProvider from '@/lib/providers/query-provider';

// Issue #211: New font stack - DM Sans (display), Plus Jakarta Sans (body), JetBrains Mono (data)
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-display",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Supply Chain Tracker",
  description: "Plataforma para rastrear la cadena de suministro de netbooks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <body className="font-body bg-background text-foreground">
        <QueryProvider>
          <SolanaWalletClientProvider>
            <SolanaEventProvider>
              <div className="min-h-screen bg-background relative isolate">
                {/* Issue #211: Removed gradient blob backgrounds, replaced with clean design */}
                
                <Header />
                <main className="flex-1 relative">
                  <RequireWallet>
                    <div className="container mx-auto px-4 py-8 relative z-10">
                      {children}
                    </div>
                  </RequireWallet>
                </main>
                <Toaster />
                <NotificationContainer />
              </div>
              {/* Debug components - only in development with explicit flag */}
              {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' && (
                <>
                  <DiagnosticRunner />
                  <DebugComponent />
                </>
              )}
            </SolanaEventProvider>
          </SolanaWalletClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
