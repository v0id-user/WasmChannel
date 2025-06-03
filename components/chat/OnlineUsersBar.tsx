import type { User } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";

interface OnlineUsersBarProps {
	onlineUsersCount: number;
}

export function OnlineUsersBar({ onlineUsersCount }: OnlineUsersBarProps) {
	return (
		<div className="bg-gray-100 p-2 border-b border-gray-200 flex-shrink-0">
			<div className="flex items-center gap-2 text-sm">
				<div className="inline-grid *:[grid-area:1/1]">
					<div className="status status-success animate-ping [animation-duration:3s]"></div>
					<div className="status status-success"></div>
				</div>
				<span className="text-gray-600">
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
