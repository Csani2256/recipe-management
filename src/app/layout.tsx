import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
    title: "Morzsa — A kedvenc receptjeid otthona",
    description: "Gyűjtsd össze a receptjeidet írásban vagy fotón, és találd meg őket bármikor, telefonon és weben is.",
    applicationName: "Morzsa",
    // manifest: "/manifest.webmanifest",
    // appleWebApp: { capable: true, title: "Morzsa", statusBarStyle: "default" },
    // icons: {
    //   icon: [
    //     { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    //     { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    //   ],
    //   apple: "/icons/icon-192.png",
    // },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#1d493b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return <html lang="hu"><body>{children}</body></html>;
}