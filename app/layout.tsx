import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import ClientBootstrap from "./bootstrap";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
	variable: "--font-ibm-plex-sans-arabic",
	subsets: ["arabic"],
	weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Wasm Channel (Experimental Project)",
	description:
		"Chat application built with some WebAssembly features to test next.js with wasm",
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
					{/* This is a client side bootstrap component that will setup the store and the wasm modules */}
					<ClientBootstrap />
					{children}
				</Providers>
			</body>
		</html>
	);
}
