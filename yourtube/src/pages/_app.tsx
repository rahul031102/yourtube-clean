import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import OtpDialog from "@/components/OtpDialog";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import { UserProvider } from "../lib/AuthContext";
import { useDynamicTheme } from "../lib/useDynamicTheme";

export default function App({ Component, pageProps }: AppProps) {
  useDynamicTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <UserProvider>
      <div className="min-h-screen bg-background text-foreground pt-16">
        <title>Your-Tube Clone</title>
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <Toaster />
        <OtpDialog />
        <div className="flex min-h-screen relative">
        {/* <div className="flex min-h-screen"> */}
          <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
         {/* <div className="flex-1 w-full min-w-0"> */}
         <div className="flex-1 w-full min-w-0 md:pl-64">
            <Component {...pageProps} />
          </div>
          {/* <Component {...pageProps} /> */}
        </div>
      </div>
    </UserProvider>
  );
}
