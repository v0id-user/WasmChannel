import type { User } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";

interface OnlineUsersBarProps {
	users: User[];
}

export function OnlineUsersBar({ users }: OnlineUsersBarProps) {
	const onlineUsers = users.filter((user) => user.isOnline);

	return (
		<div className="bg-gray-100 p-2 border-b border-gray-200 flex-shrink-0">
			<div className="flex items-center gap-2 text-sm">
				<div className="inline-grid *:[grid-area:1/1]">
					<div className="status status-success animate-ping [animation-duration:3s]"></div>
					<div className="status status-success"></div>
				</div>
				<span className="text-gray-600">{onlineUsers.length} متصل الآن</span>

				<div className="flex items-center gap-1 mr-2">
					{onlineUsers.slice(0, 6).map((user) => (
						<div key={user.id} className="group relative">
							<UserAvatar user={user} size="xs" />
							<div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
								{user.name}
							</div>
						</div>
					))}
					{onlineUsers.length > 6 && (
						<div className="text-xs text-gray-500 mr-1">
							+{onlineUsers.length - 6}
						</div>
					)}
				</div>
			</div>
		</div>
	);
} 