import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XFeed — Your X Feed Briefing",
  description:
    "Get the most important content from your X feed, summarized and delivered as text or audio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Source+Serif+4:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&family=Libre+Baskerville:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
