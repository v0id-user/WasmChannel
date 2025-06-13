interface ChatHeaderProps {
	title?: string;
	subtitle?: string;
}

export function ChatHeader({
	title = "قناة التجريب",
	subtitle = "مشروع تجريبي للدردشة",
}: ChatHeaderProps) {
	return (
		<div
			className="text-white p-4 flex-shrink-0 border-b font-mono"
			style={{ backgroundColor: "#000000", borderBottomColor: "#0143EB" }}
		>
			<h1 className="text-sm font-bold tracking-wide uppercase font-mono">
				{title}
			</h1>
			<p className="text-xs mt-1 font-mono" style={{ color: "#0143EB" }}>
				{subtitle}
			</p>
		</div>
	);
}
