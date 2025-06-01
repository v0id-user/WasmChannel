// Utility function to generate avatar color based on name
export function getAvatarColor(name: string): string {
	const colors = [
		"bg-blue-500",
		"bg-green-500",
		"bg-purple-500",
		"bg-red-500",
		"bg-yellow-500",
		"bg-pink-500",
		"bg-indigo-500",
		"bg-teal-500",
	];
	const hash = name.split("").reduce((a, b) => {
		a = (a << 5) - a + b.charCodeAt(0);
		return a & a;
	}, 0);
	return colors[Math.abs(hash) % colors.length];
} 