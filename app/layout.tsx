import type { Metadata } from "next"
import "./globals.css"
import Sidebar from "@/components/layout/Sidebar"

export const metadata: Metadata = {
  title: "Travel CRM",
  description: "Turizm idarəetməsi sistemi",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az">
      <body>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
