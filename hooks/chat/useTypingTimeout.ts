import { useRef, useCallback } from "react";
import type { User } from "@/types/chat";

/**
 * Hook to manage typing timeouts - automatically removes users from typing list
 * after they stop typing for a certain duration
 */
export function useTypingTimeout(
	setTypingUsers: React.Dispatch<React.SetStateAction<User[]>>,
	timeoutDuration = 3000, // 3 seconds default
) {
	const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

	const addTypingUser = useCallback(
		(user: User) => {
			// Clear existing timeout for this user
			const existingTimeout = typingTimeouts.current.get(user.id);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}

			// Add user to typing list if not already there
			setTypingUsers((prev) => {
				if (prev.find((u) => u.id === user.id)) {
					return prev; // User already in list
				}
				return [...prev, user];
			});

			// Set new timeout to remove user
			const newTimeout = setTimeout(() => {
				setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
				typingTimeouts.current.delete(user.id);
			}, timeoutDuration);

			typingTimeouts.current.set(user.id, newTimeout);
		},
		[setTypingUsers, timeoutDuration],
	);

	const removeTypingUser = useCallback(
		(userId: string) => {
			// Clear timeout
			const existingTimeout = typingTimeouts.current.get(userId);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
				typingTimeouts.current.delete(userId);
			}

			// Remove user from typing list
			setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
		},
		[setTypingUsers],
	);

	const clearAllTimeouts = useCallback(() => {
		// Clear all timeouts on cleanup
		typingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
		typingTimeouts.current.clear();
	}, []);

	return {
		addTypingUser,
		removeTypingUser,
		clearAllTimeouts,
	};
}
