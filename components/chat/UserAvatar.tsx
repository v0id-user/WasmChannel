import type { User } from "@/types/chat";
import { getAvatarColor } from "@/utils/chat";

interface UserAvatarProps {
	user: User;
	size?: "xs" | "sm";
}

export function UserAvatar({ user, size = "sm" }: UserAvatarProps) {
	const sizeClasses = {
		xs: "w-5 h-5 text-xs",
		sm: "w-6 h-6 text-xs",
	};

	return (
		<div
			className={`${sizeClasses[size]} rounded-full ${getAvatarColor(user.name)} text-white flex items-center justify-center font-medium relative flex-shrink-0`}
		>
			{user.name.charAt(0).toUpperCase()}
			{user.isOnline && (
				<div className="w-2 h-2 bg-green-500 rounded-full absolute -bottom-0 -right-0 border border-white"></div>
			)}
		</div>
	);
} 