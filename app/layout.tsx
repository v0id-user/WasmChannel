import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
	variable: "--font-ibm-plex-sans-arabic",
	subsets: ["arabic"],
	weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "قناة WASM (مشروع تجريبي)",
	description:
		"تطبيق دردشة مبني باستخدام ميزات WebAssembly لاختبار next.js مع wasm",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ar">
			<body className={`${ibmPlexSansArabic.variable} antialiased`}>
				<Providers>
					{/* This is a client side bootstrap component that will setup the store, the wasm modules and the chat client */}
					{children}
				</Providers>
			</body>
		</html>
	);
}
