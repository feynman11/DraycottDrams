import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Draycott Drambusters - Whisky Club",
  description: "Discover and explore the finest whiskies with the Draycott Drambusters whisky club. Interactive world map, tasting notes, and AI sommelier recommendations.",
  keywords: ["whisky", "whiskey", "scotch", "bourbon", "tasting", "club", "spirits"],
  authors: [{ name: "Draycott Drambusters" }],
  creator: "Draycott Drambusters",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}
