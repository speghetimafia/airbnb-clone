import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import Header, { LoginModal, MobileNav } from "@/components/Header";
import { UserProvider } from "@/lib/user";
import "./globals.css";

export const metadata: Metadata = {
  title: "Airbnb | Holiday rentals, cabins, beach houses & more",
  description: "Find holiday rentals, cabins, beach houses, unique homes and experiences across India.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
