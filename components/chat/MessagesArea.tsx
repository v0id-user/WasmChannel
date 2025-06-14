import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import type { User } from "@/types/chat";
import { ReactionKind } from "@/utils/wasm/init";
import { GroupedMessage } from "@/utils/chat/messageGrouping";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";

interface MessagesAreaProps {
	groupedMessages: GroupedMessage[];
	typingUsers: User[];
	currentUserId: string;
	onReactionClick: (messageId: string, reactionKind: ReactionKind) => void;
	// Infinite scroll props
	hasMoreMessages: boolean;
	onLoadMore: () => void;
	// Manual scroll props
	onManualScrollChange: (isManualScrolling: boolean) => void;
	scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
}

export function MessagesArea({
	groupedMessages,
	typingUsers,
	currentUserId,
	onReactionClick,
	hasMoreMessages,
	onLoadMore,
	onManualScrollChange,
	scrollToBottomRef,
}: MessagesAreaProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [shouldMaintainScrollPosition, setShouldMaintainScrollPosition] = useState(false);
	const [isManualScrolling, setIsManualScrolling] = useState(false);
	const [wasManualScrollingBeforeLoad, setWasManualScrollingBeforeLoad] = useState(false);
	const previousScrollHeight = useRef<number>(0);

	// Sort messages by timestamp to ensure chronological order
	const sortedGroupedMessages = useMemo(() => {
		return [...groupedMessages].sort((a, b) => {
			const aTime = a.message.timestamp ? new Date(a.message.timestamp).getTime() : 0;
			const bTime = b.message.timestamp ? new Date(b.message.timestamp).getTime() : 0;
			return aTime - bTime; // Oldest first (chronological order)
		});
	}, [groupedMessages]);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		setIsManualScrolling(false);
		setWasManualScrollingBeforeLoad(false);
		onManualScrollChange(false);
	}, [onManualScrollChange]);

	// Expose scrollToBottom to parent
	useEffect(() => {
		scrollToBottomRef.current = scrollToBottom;
	}, [scrollToBottom, scrollToBottomRef]);

	// Check if user is at the bottom of the scroll
	const isAtBottom = useCallback(() => {
		if (!scrollContainerRef.current) return true;
		const container = scrollContainerRef.current;
		const threshold = 100; // 100px threshold
		return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
	}, []);

	// Scroll to bottom when new messages arrive (but NOT when loading more or manually scrolling)
	useEffect(() => {
		// Don't auto-scroll if:
		// 1. We're maintaining scroll position (infinite loading)
		// 2. User is manually scrolling
		// 3. User was manually scrolling before infinite load
		// 4. We're currently loading more messages
		const shouldSkipAutoScroll = shouldMaintainScrollPosition || 
			isManualScrolling || 
			wasManualScrollingBeforeLoad || 
			isLoadingMore;

		if (!shouldSkipAutoScroll) {
			scrollToBottom();
		}
	}, [sortedGroupedMessages, typingUsers, scrollToBottom, shouldMaintainScrollPosition, isManualScrolling, wasManualScrollingBeforeLoad, isLoadingMore]);

	// Handle scroll position after loading more messages
	useEffect(() => {
		if (shouldMaintainScrollPosition && scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			const newScrollHeight = container.scrollHeight;
			const heightDifference = newScrollHeight - previousScrollHeight.current;
			
			// Maintain scroll position by adjusting scrollTop
			container.scrollTop = container.scrollTop + heightDifference;
			
			setShouldMaintainScrollPosition(false);
			setIsLoadingMore(false);
			
			// If user was manually scrolling before load, restore that state
			if (wasManualScrollingBeforeLoad) {
				// Check if still not at bottom after loading
				setTimeout(() => {
					const stillNotAtBottom = !isAtBottom();
					setIsManualScrolling(stillNotAtBottom);
					onManualScrollChange(stillNotAtBottom);
					if (!stillNotAtBottom) {
						setWasManualScrollingBeforeLoad(false);
					}
				}, 100);
			}
		}
	}, [sortedGroupedMessages, shouldMaintainScrollPosition, wasManualScrollingBeforeLoad, isAtBottom, onManualScrollChange]);

	// Handle scroll events for infinite scroll and manual scroll detection
	const handleScroll = useCallback(async () => {
		if (!scrollContainerRef.current) return;

		const container = scrollContainerRef.current;
		const { scrollTop, scrollHeight } = container;

		// Check if user is manually scrolling (not at bottom)
		const atBottom = isAtBottom();
		const newManualScrolling = !atBottom && !shouldMaintainScrollPosition;
		
		if (newManualScrolling !== isManualScrolling) {
			setIsManualScrolling(newManualScrolling);
			onManualScrollChange(newManualScrolling);
		}

		// Infinite scroll logic
		if (isLoadingMore || !hasMoreMessages) {
			return;
		}

		// Check if user scrolled to the very top (within 5px threshold)
		if (scrollTop <= 5) {
			console.log("MessagesArea: User scrolled to top, loading more messages...");
			
			// Preserve manual scrolling state before loading
			setWasManualScrollingBeforeLoad(isManualScrolling);
			
			setIsLoadingMore(true);
			setShouldMaintainScrollPosition(true);
			previousScrollHeight.current = scrollHeight;
			
			// Load more messages
			await onLoadMore();
		}
	}, [isLoadingMore, hasMoreMessages, onLoadMore, isAtBottom, shouldMaintainScrollPosition, isManualScrolling, onManualScrollChange]);

	// Add scroll event listener
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		container.addEventListener('scroll', handleScroll);
		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
	}, [handleScroll]);

	return (
		<div 
			ref={scrollContainerRef}
			className="flex-1 overflow-y-auto h-full"
		>
			{/* Loading indicator at the top */}
			{isLoadingMore && (
				<div className="px-3 py-2 text-center font-mono text-sm" style={{ color: "#0143EB" }}>
					<span className="animate-pulse">جاري تحميل المزيد...</span>
				</div>
			)}

			{/* End of messages indicator */}
			{!hasMoreMessages && sortedGroupedMessages.length > 0 && (
				<div className="px-3 py-2 text-center font-mono text-xs opacity-60" style={{ color: "#666666" }}>
					<span>• نهاية الرسائل •</span>
				</div>
			)}

			{/* Messages */}
			{sortedGroupedMessages.map(({ message, showAvatar, user }, index) => {
				// Safe timestamp handling for unique keys
				const timestampKey = message.timestamp 
					? (typeof message.timestamp === 'object' && message.timestamp.getTime 
						? message.timestamp.getTime() 
						: String(message.timestamp))
					: Date.now();
				
				return (
					<ChatMessage
						key={`msg-${message.id}-${message.refrenceId}-${index}-${timestampKey}`}
						message={message}
						user={user}
						showAvatar={showAvatar}
						onReactionClick={onReactionClick}
						currentUserId={currentUserId}
					/>
				);
			})}

			{/* Typing indicator */}
			<TypingIndicator typingUsers={typingUsers} />

			{/* Scroll anchor */}
			<div ref={messagesEndRef} />
		</div>
	);
}
