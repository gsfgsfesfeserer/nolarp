import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_JP, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "800", "900"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoJp = Noto_Sans_JP({
  variable: "--font-jp",
  weight: ["400", "700", "900"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoLarp — аниме без ролевых игр",
  description:
    "いいえ. Каталог из 77 аниме с полными пересказами сюжета — честно, до последнего спойлера. Герои, цитаты, опенинги и эндинги. Плеер — смотрите аниме прямо на сайте. Никакого ларпа.",
  keywords: [
    "аниме",
    "каталог аниме",
    "пересказ сюжета",
    "NoLarp",
    "аниме онлайн",
    "смотреть аниме",
    "сюжет аниме",
    "спойлеры",
  ],
  authors: [{ name: "NoLarp" }],
  openGraph: {
    title: "NoLarp — аниме без ролевых игр",
    description:
      "77 тайтлов, 99 000+ слов пересказа. Полные сюжеты с концовками, герои, музыка и встроенный плеер. Ларпу — нет.",
    siteName: "NoLarp",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body
        className={`${unbounded.variable} ${manrope.variable} ${notoJp.variable} antialiased bg-background text-foreground font-body`}
      >
        {children}
      </body>
    </html>
  );
}
