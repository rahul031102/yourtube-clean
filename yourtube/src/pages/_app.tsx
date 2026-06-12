import Head from "next/head";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen((previous) => !previous);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black">
        <Head>
          <title>YourTube Clone</title>
        </Head>
        <Header onMenuClick={handleSidebarToggle} />
        <Toaster />
        <div className="flex flex-col md:flex-row flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
          <main className="flex-1 min-w-0">
            <Component {...pageProps} />
          </main>
        </div>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={handleSidebarClose}
          />
        )}
      </div>
    </UserProvider>
  );
}
