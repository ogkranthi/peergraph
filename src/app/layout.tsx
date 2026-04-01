import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeerGraph.ai",
  description:
    "The open graph connecting AI researchers and builders. See who's publishing, who's building, and how research becomes real-world impact.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-[#ededed] min-h-screen`}
      >
        <Navbar />
        <KeyboardShortcuts />
        <main>{children}</main>
        <div className="fixed bottom-3 right-3 text-[10px] text-white/15 pointer-events-none hidden sm:block">
          G = Graph &middot; S = Search &middot; / = Focus search
        </div>
      </body>
    </html>
  );
}
