interface LoadingStateProps {
	message?: string;
}

export function LoadingState({ message = "جاري التحميل" }: LoadingStateProps) {
	return (
		<div
			className="min-h-screen flex items-center justify-center"
			style={{ backgroundColor: "#F3F3F3" }}
		>
			<div
				className="w-full max-w-2xl h-96 bg-white border"
				style={{ borderColor: "#000000" }}
			>
				<div className="h-full flex items-center justify-center">
					<div className="font-mono text-lg" style={{ color: "#0143EB" }}>
						<span className="animate-pulse">_</span>
						<span className="animate-pulse">...</span>
						{message}
					</div>
				</div>
			</div>
		</div>
	);
}
