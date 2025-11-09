import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LockerLink - Connect with OVA Volleyball Players",
  description: "Social messaging app for OVA volleyball players",
  manifest: "/manifest.json",
  applicationName: "LockerLink",
  icons: {
    icon: [
      { url: "/appicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/appicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LockerLink",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5B342",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
