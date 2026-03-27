import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { DesktopStatus } from "@/components/desktop-status";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "TSX Studio | Home",
    description: "Advanced AI Video Production",
    icons: {
        icon: "/logo.jpg",
        shortcut: "/logo.jpg",
        apple: "/logo.jpg",
    }
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    {children}
                    <DesktopStatus />
                </Providers>
            </body>
        </html>
    );
}
