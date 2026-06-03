import type { Metadata } from "next"
import "./globals.css"
import LayoutWrapper from "@/components/layout/LayoutWrapper"
import { ThemeProvider } from "@/components/ThemeProvider"

export const metadata: Metadata = {
  title: "itstour CRM",
  description: "Turizm idarəetməsi sistemi",
  icons: { icon: "/logo.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>
        <ThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}