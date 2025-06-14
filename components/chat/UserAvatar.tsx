import type { User } from "@/types/chat";

interface UserAvatarProps {
	user: User;
	size?: "xs" | "sm";
}

export function UserAvatar({ user, size = "sm" }: UserAvatarProps) {
	const sizeClasses = {
		xs: "w-4 h-4 text-xs",
		sm: "w-5 h-5 text-xs",
	};

	// Generate a color based on the first 4 characters of the username
	const generateColor = (name: string) => {
		const colors = [
			"#0143EB", // Blue
			"#FF6B6B", // Red
			"#4CAF50", // Green
			"#FFC107", // Yellow
		];
		
		// Get the sum of ASCII codes of first 4 characters
		const sum = name
			.slice(0, 4)
			.split("")
			.reduce((acc, char) => acc + char.charCodeAt(0), 0);
		
		// Use modulo to select a color
		return colors[sum % colors.length];
	};

	const avatarColor = generateColor(user.name);

	return (
		<div
			className={`${sizeClasses[size]} text-white flex items-center justify-center font-bold tracking-wide relative flex-shrink-0 border font-mono`}
			style={{
				backgroundColor: avatarColor,
				borderColor: "#000000",
				color: "#FFFFFF",
			}}
		>
			{user.name.charAt(0).toUpperCase()}
			{user.isOnline && (
				<div
					className="w-1.5 h-1.5 border absolute -bottom-0 -right-0"
					style={{ backgroundColor: avatarColor, borderColor: "#000000" }}
				></div>
			)}
		</div>
	);
}
