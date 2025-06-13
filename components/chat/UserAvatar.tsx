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
			className={`${sizeClasses[size]} text-white flex items-center justify-center font-bold tracking-wide relative flex-shrink-0 border font-mono`}
			style={{
				backgroundColor: "#0143EB",
				borderColor: "#000000",
				color: "#FFFFFF",
			}}
		>
			{user.name.charAt(0).toUpperCase()}
			{user.isOnline && (
				<div
					className="w-2 h-2 border absolute -bottom-0 -right-0"
					style={{ backgroundColor: "#0143EB", borderColor: "#000000" }}
				></div>
			)}
		</div>
	);
}
