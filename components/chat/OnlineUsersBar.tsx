interface OnlineUsersBarProps {
	onlineUsersCount: number;
}

export function OnlineUsersBar({ onlineUsersCount }: OnlineUsersBarProps) {
	return (
		<div
			className="p-3 border-b flex-shrink-0 font-mono"
			style={{ backgroundColor: "#F3F3F3", borderBottomColor: "#000000" }}
		>
			<div className="flex items-center gap-3 text-sm font-mono">
				<div className="relative">
					<div
						className="w-3 h-3 border animate-ping"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
					<div
						className="absolute top-0 left-0 w-3 h-3 border"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
				</div>
				<span
					className="font-bold tracking-wide font-mono"
					style={{ color: "#000000" }}
				>
					{onlineUsersCount === 0
						? "لا يوجد متصلين"
						: onlineUsersCount === 1
							? "متصل واحد"
							: onlineUsersCount === 2
								? "متصلين"
								: `${onlineUsersCount} متصلين`}
				</span>
			</div>
		</div>
	);
}
