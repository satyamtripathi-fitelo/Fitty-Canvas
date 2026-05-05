import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fitty",
  display: "swap",
  weight: ["600", "700"]
});

export const metadata: Metadata = {
  title: "Fitty Canvas",
  description: "AI-powered image resizing and enhancement."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fredoka.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" theme="system" />
        </AuthProvider>
      </body>
    </html>
  );
}
