"use client";

import Chat from "@/components/chat";
import { useStoreClient } from "@/store/client";

export default function Home() {
	const { bootstrapped } = useStoreClient();

	if (!bootstrapped) {
		return (
			<div className="flex items-center justify-center min-h-screen z-50">
				<div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}
	return <Chat />;
}
