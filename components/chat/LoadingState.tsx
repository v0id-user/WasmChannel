interface LoadingStateProps {
	message?: string;
}

export function LoadingState({
	message = "جاري التحميل...",
}: LoadingStateProps) {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="w-full max-w-2xl h-96 bg-white rounded-lg shadow-lg border border-gray-200">
				<div className="h-full flex items-center justify-center">
					<div className="text-gray-500">{message}</div>
				</div>
			</div>
		</div>
	);
}
