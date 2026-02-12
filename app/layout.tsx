import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM магазина запчастей",
  description: "Система управления клиентами и продажами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
