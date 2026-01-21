import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "ACID Lab - Database Property Simulator",
  description:
    "Interactive simulator to learn ACID properties: Atomicity, Consistency, Isolation, and Durability. Perfect for beginners learning database transactions.",
  keywords: ["ACID", "database", "transactions", "atomicity", "consistency", "isolation", "durability", "learning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-hidden transition-theme">
        <ThemeProvider>
          <main className="h-screen w-full overflow-y-auto bg-background relative">
            {/* Background Grid Pattern */}
            <div
              className="fixed inset-0 z-0 opacity-[0.03] text-foreground grid-pattern pointer-events-none"
            />
            <div className="relative z-10">{children}</div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
