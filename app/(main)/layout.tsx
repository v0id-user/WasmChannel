"use client";

import { useStoreClient } from "@/store/client";

export default function MainLayout({
	children,
}: { children: React.ReactNode }) {
	const { bootstrapped } = useStoreClient();

	if (process.env.NEXT_PUBLIC_DEBUG !== "yes") {
		return <div className="flex items-center justify-center min-h-screen"><strong>Test pages only on debug mode...</strong></div>;
	}

	if (!bootstrapped) {
		return (
			<div className="flex items-center justify-center min-h-screen z-50">
				<div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return <>{children}</>;
}
