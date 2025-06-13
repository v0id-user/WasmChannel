interface OnlineUsersBarProps {
	onlineUsersCount: number;
}

export function OnlineUsersBar({ onlineUsersCount }: OnlineUsersBarProps) {
	return (
		<div
			className="p-2 border-b-[0.5px] flex-shrink-0 font-mono"
			style={{ backgroundColor: "#F3F3F3", borderBottomColor: "#000000" }}
		>
			<div className="flex items-center gap-2 text-sm font-mono">
				<div className="relative">
					<div
						className="w-2 h-2 border-[0.5px] animate-ping"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
					<div
						className="absolute top-0 left-0 w-2 h-2 border"
						style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
					></div>
				</div>
				<span
					className="font-black tracking-wide font-mono"
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
