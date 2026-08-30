import type { Metadata } from "next";
import { StoreProvider } from "@/context/store-context";
import { InactivityTimer } from "@/components/auth/inactivity-timer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elevates OS",
  description:
    "The Operating System for student innovation communities. Learn. Build. Grow. Ship. Repeat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <StoreProvider>
          <InactivityTimer />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
