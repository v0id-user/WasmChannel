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
			className="px-3 py-1 flex-shrink-0 border-b font-mono text-xs"
			style={{
				backgroundColor: "#F8F8F8",
				borderBottomColor: "#E0E0E0",
				color: "#666666",
			}}
		>
			<div className="flex items-center justify-between">
				<span className="font-normal tracking-wide font-mono">{title}</span>
				<span className="text-xs opacity-60 font-mono">{subtitle}</span>
			</div>
		</div>
	);
}
