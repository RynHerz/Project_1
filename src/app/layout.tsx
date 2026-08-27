import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALPR Vision - Deteksi Plat Kendaraan Indonesia (Client-Side AI)",
  description: "Aplikasi deteksi dan pengenalan plat nomor kendaraan (ALPR / ANPR) berbasis Next.js tanpa perlu server eksternal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
