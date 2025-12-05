import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindFi Terminal",
  description: "AI-native DeFi platform powered by Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-terminal-bg antialiased">
        {children}
      </body>
    </html>
  );
}
