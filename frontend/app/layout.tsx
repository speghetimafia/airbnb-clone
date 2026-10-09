import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "sonner";
import Header, { LoginModal, MobileNav } from "@/components/Header";
import { UserProvider } from "@/lib/user";
import "./globals.css";

export const metadata: Metadata = {
  title: "Airbnb | Holiday rentals, cabins, beach houses & more",
  description: "Find holiday rentals, cabins, beach houses, unique homes and experiences across India.",
};

// Airbnb Cereal. Medium covers 500-600 so Tailwind's font-semibold renders like airbnb.com.
const cereal = localFont({
  src: [
    { path: "./fonts/cereal-400.woff2", weight: "400" },
    { path: "./fonts/cereal-500.woff2", weight: "500 600" },
    { path: "./fonts/cereal-700.woff2", weight: "700" },
    { path: "./fonts/cereal-800.woff2", weight: "800" },
  ],
  variable: "--font-cereal",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (e.g. QuillBot) add attributes to <html> before hydration; ignore those here only.
    <html lang="en" className={cereal.variable} suppressHydrationWarning>
      <body className="pb-16 md:pb-0">
        <UserProvider>
          <Suspense fallback={<div className="h-20 border-b border-line" />}>
            <Header />
          </Suspense>
          {children}
          <MobileNav />
          <LoginModal />
          <Toaster position="bottom-left" toastOptions={{ style: { borderRadius: 12, fontSize: 14 } }} />
        </UserProvider>
      </body>
    </html>
  );
}
