import { useState, useEffect, useCallback } from "react";
import type { Message as ChatMessage, User } from "@/types/chat";
import { users, getInitialMessages } from "@/constants/chat";
import { orpc, client } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";
import { Message as OrpcMessage } from "@/types/orpc";
import { authClient } from "@/lib/auth-client";

export function useChatState() {
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [hasMoreMessages, setHasMoreMessages] = useState(true);

	const {
		data: messagesResponse,
		isPending,
		isError,
		error,
	} = useQuery(
		orpc.messages.get.queryOptions({
			input: {
				cursor: cursor,
				limit: 20, // Reduced from 100 for better infinite scroll experience
			},
			refetchOnWindowFocus: false,
		}),
	);

	// Very bad, but the tanstack query layer handle the double call to the server
	const { data: session } = authClient.useSession();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [typingUsers, setTypingUsers] = useState<User[]>([]);
	const [onlineUsersCount, setOnlineUsersCount] = useState<number>(0);
	const [isClient, setIsClient] = useState(false);

	// Aggressive deduplication effect - runs whenever messages change
	useEffect(() => {
		setMessages((currentMessages) => {
			if (currentMessages.length === 0) return currentMessages;

			// Create a Map to track unique messages by id
			const uniqueMessagesMap = new Map<string, ChatMessage>();

			// Add messages to map (later messages with same ID will overwrite earlier ones)
			currentMessages.forEach((message) => {
				uniqueMessagesMap.set(message.id, message);
			});

			// Convert back to array
			const deduplicatedMessages = Array.from(uniqueMessagesMap.values());

			// Only update if we actually removed duplicates
			if (deduplicatedMessages.length !== currentMessages.length) {
				console.log(
					`Aggressive dedup: Removed ${currentMessages.length - deduplicatedMessages.length} duplicate messages`,
				);
				return deduplicatedMessages;
			}

			return currentMessages;
		});
	}, [messages.length]); // Only run when array length changes

	// Function to load more messages
	const loadMoreMessages = useCallback(async () => {
		console.log("loadMoreMessages: Loading more messages...");
		if (!hasMoreMessages || !messages.length) {
			console.log(
				"loadMoreMessages: Skipping load - hasMoreMessages:",
				hasMoreMessages,
				"messages.length:",
				messages.length,
			);
			return;
		}

		console.log("loadMoreMessages: Loading more messages...");

		try {
			// Get the oldest message ID as cursor
			const oldestMessage = messages[messages.length - 1];
			const newCursor = oldestMessage?.refrenceId;

			console.log("loadMoreMessages: Using cursor:", newCursor);

			// Fetch more messages using the client directly
			const response = await client.messages.get({
				cursor: newCursor,
				limit: 20,
			});

			if (response.messages.length === 0) {
				setHasMoreMessages(false);
				console.log("loadMoreMessages: No more messages available");
				return;
			}

			if (response.messages && response.messages.length > 0) {
				const orpcMessages = response.messages as OrpcMessage[];
				console.log(
					"loadMoreMessages: Got",
					orpcMessages.length,
					"new messages",
				);

				// Ultra-aggressive deduplication
				const currentMessageIds = new Set(messages.map((msg) => msg.id));
				const currentReferenceIds = new Set(
					messages.map((msg) => msg.refrenceId),
				);

				const newChatMessages = orpcMessages
					.filter((message) => {
						// Filter by both ID and reference ID
						const isDuplicateById = currentMessageIds.has(message.id);
						const isDuplicateByRef = currentReferenceIds.has(
							message.refrenceId,
						);

						if (isDuplicateById || isDuplicateByRef) {
							console.log(
								"loadMoreMessages: Filtering duplicate - ID:",
								isDuplicateById,
								"Ref:",
								isDuplicateByRef,
								"MessageID:",
								message.id,
							);
							return false;
						}
						return true;
					})
					.map((message) => {
						const chatMessage: ChatMessage = {
							id: message.id,
							refrenceId: message.refrenceId,
							userId: message.sentBy,
							text: message.message,
							timestamp: message.createdAt,
							reactions: Array.isArray(message.reactions)
								? message.reactions.map((reaction) => ({
										kind: reaction.kind,
										count: reaction.count,
										users: reaction.users,
									}))
								: [],
							isOwn: message.sentBy === session?.user?.id,
						};
						return chatMessage;
					});

				console.log(
					"loadMoreMessages: Filtered to",
					newChatMessages.length,
					"unique messages",
				);

				// Only add messages if we have new unique ones
				if (newChatMessages.length > 0) {
					// Append new messages to the end with additional deduplication
					setMessages((prev) => {
						const combined = [...prev, ...newChatMessages];
						// Final deduplication pass using Map
						const finalDedup = new Map<string, ChatMessage>();
						combined.forEach((msg) => finalDedup.set(msg.id, msg));
						return Array.from(finalDedup.values());
					});
				}

				// If we got fewer messages than requested, we've reached the end
				if (orpcMessages.length < 20) {
					setHasMoreMessages(false);
					console.log(
						"loadMoreMessages: No more messages available ORPC IS NOT MEETING THE LIMIT",
					);
				}
			} else {
				setHasMoreMessages(true);
				console.log("loadMoreMessages: There is more messages available");
			}
		} catch (error) {
			console.error("loadMoreMessages: Error loading more messages:", error);
		}
	}, [hasMoreMessages, messages, session?.user?.id]);

	// Initialize on client side only
	useEffect(() => {
		// Wait for orpc to fetch messages
		if (isPending || !session) {
			console.log(
				"useChatState: Waiting for messages to load or user to be loaded...",
			);
			return;
		}

		console.log("useChatState: Initializing client state");
		setIsClient(true);

		// Initialize with static users count for fallback
		const onlineUsers = users.filter((u) => u.isOnline).length;
		console.log(
			"useChatState: Setting initial online users count:",
			onlineUsers,
		);
		setOnlineUsersCount(onlineUsers);

		if (process.env.NEXT_PUBLIC_DEBUG === "yes") {
			console.log("useChatState: Debug mode enabled, setting initial messages");
			setMessages(getInitialMessages());
		}

		// Add messages from orpc
		if (messagesResponse) {
			console.log("useChatState: Processing messages from orpc");
			const orpcMessages = messagesResponse.messages as OrpcMessage[];
			console.log("useChatState: Found", orpcMessages.length, "messages");

			// Ultra-aggressive deduplication for initial load
			const uniqueMessageMap = new Map<string, OrpcMessage>();
			const uniqueReferenceMap = new Map<string, OrpcMessage>();

			// First pass: deduplicate by ID
			orpcMessages.forEach((message) => {
				uniqueMessageMap.set(message.id, message);
			});

			// Second pass: deduplicate by reference ID
			Array.from(uniqueMessageMap.values()).forEach((message) => {
				if (!uniqueReferenceMap.has(message.refrenceId)) {
					uniqueReferenceMap.set(message.refrenceId, message);
				} else {
					console.log(
						"useChatState: Filtering out duplicate by reference ID:",
						message.refrenceId,
					);
				}
			});

			const finalUniqueMessages = Array.from(uniqueReferenceMap.values());
			console.log(
				"useChatState: After deduplication:",
				finalUniqueMessages.length,
				"unique messages",
			);

			const chatMessages = finalUniqueMessages.map((message) => {
				const chatMessage: ChatMessage = {
					id: message.id,
					refrenceId: message.refrenceId,
					userId: message.sentBy,
					text: message.message,
					timestamp: message.createdAt,
					reactions: Array.isArray(message.reactions)
						? message.reactions.map((reaction) => ({
								kind: reaction.kind,
								count: reaction.count,
								users: reaction.users,
							}))
						: [],
					isOwn: message.sentBy === session.user.id,
				};
				return chatMessage;
			});

			console.log(
				"useChatState: Setting",
				chatMessages.length,
				"unique processed messages",
			);
			setMessages(chatMessages.reverse());

			// Check if we have fewer messages than the limit, meaning no more to load
			if (finalUniqueMessages.length < 20) {
				setHasMoreMessages(false);
				console.log("useChatState: No more messages available (initial load)");
			}
		} else {
			console.log("useChatState: No messages response available");
		}
	}, [isPending, session]);

	return {
		messages,
		setMessages,
		newMessage,
		setNewMessage,
		typingUsers,
		setTypingUsers,
		onlineUsersCount,
		setOnlineUsersCount,
		isClient,
		isError,
		isPending,
		error,
		// Infinite scroll related
		hasMoreMessages,
		loadMoreMessages,
	};
}
