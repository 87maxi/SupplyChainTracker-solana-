import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';

import { Web3Providers } from '@/components/Web3Providers';
import { Header } from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { NotificationContainer } from '@/components/ui/NotificationContainer';
import { RequireWallet } from '@/components/auth/RequireWallet';
import DiagnosticRunner from '@/components/diagnostics/DiagnosticRunner';
import DebugComponent from '@/components/diagnostics/DebugComponent';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supply Chain Tracker",
  description: "Plataforma para rastrear la cadena de suministro de netbooks",
};

// Importar el módulo de diagnóstico
import '@/lib/diagnostics/service-debug';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>
        <Web3Providers>
          <div className="min-h-screen bg-background relative isolate overflow-hidden">
            {/* Background Glows - Global */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
              <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0ea5e9] to-[#8b5cf6] opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>
            
            <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
              <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#8b5cf6] to-[#0ea5e9] opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
            </div>
            
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
          <DiagnosticRunner />
          <DebugComponent />
        </Web3Providers>
      </body>
    </html>
  );
}