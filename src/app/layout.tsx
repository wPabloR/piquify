import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { getViewer } from "@/infrastructure/queries";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Piquify", template: "%s · Piquify" },
  description: "Piques entre amigos, con las reglas claras y el bote en orden.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <Navbar viewer={viewer} />
        {children}
      </body>
    </html>
  );
}
