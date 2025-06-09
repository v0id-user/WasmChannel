interface ChatHeaderProps {
	title?: string;
	subtitle?: string;
}

export function ChatHeader({ 
	title = "قناة التجريب", 
	subtitle = "مشروع تجريبي للدردشة" 
}: ChatHeaderProps) {
	return (
		<div className="bg-gray-900 text-white p-3 rounded-t-lg flex-shrink-0">
			<h1 className="text-sm font-medium">{title}</h1>
			<p className="text-xs text-gray-400">{subtitle}</p>
		</div>
	);
} 