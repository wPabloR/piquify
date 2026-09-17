import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { getAccessToken, getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Piquify",
  description: "Porras entre amigos",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, accessToken] = await Promise.all([
    getCurrentUser(),
    getAccessToken(),
  ]);

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans dark:bg-black">
        <Navbar signedIn={Boolean(accessToken)} user={user} />
        {children}
      </body>
    </html>
  );
}
