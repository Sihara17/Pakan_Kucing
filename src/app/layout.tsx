import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SyncroCommand - Pet Automation System",
  description: "Modern pet/livestock automation system with Telegram Bot integration. Control lights, feeding schedules, and receive automated notifications.",
  keywords: ["SyncroCommand", "pet automation", "livestock", "Telegram Bot", "IoT", "automation", "Next.js"],
  authors: [{ name: "SyncroCommand Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "SyncroCommand - Pet Automation System",
    description: "Control your pet/livestock automation with Telegram Bot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SyncroCommand - Pet Automation System",
    description: "Control your pet/livestock automation with Telegram Bot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
