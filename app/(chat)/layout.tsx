import WhatInTheWorldIsThis from "@/components/WhatInTheWorldIsThis";

export default function ChatLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<>
			<div className="font-mono">
				<WhatInTheWorldIsThis />
				{children}
			</div>
		</>
	);
}
