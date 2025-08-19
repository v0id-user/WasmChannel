import { useRef, useCallback, useEffect, useState } from "react";

interface MessageInputProps {
	newMessage: string;
	setNewMessage: (message: string) => void;
	onSendMessage: () => void;
}

export function MessageInput({
	newMessage,
	setNewMessage,
	onSendMessage,
}: MessageInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const MAX_LENGTH = 256;

	// Rate limiting configuration
	const MESSAGE_TIMEOUT_SECONDS = 5;
	const MAX_MESSAGES_PER_HOUR = 10;

	// State for rate limiting
	const [timeoutRemaining, setTimeoutRemaining] = useState(0);
	const [hourlyMessages, setHourlyMessages] = useState<number[]>([]);

	// Check if user can send message
	const canSendMessage =
		timeoutRemaining === 0 &&
		hourlyMessages.length < MAX_MESSAGES_PER_HOUR &&
		newMessage.trim().length > 0;

	// Clean up old messages periodically
	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const now = Date.now();
			const oneHourAgo = now - 60 * 60 * 1000;

			setHourlyMessages((prev) => {
				const recentMessages = prev.filter((time) => time > oneHourAgo);
				// Only update if there's actually a change
				return recentMessages.length !== prev.length ? recentMessages : prev;
			});
		}, 60000); // Check every minute

		return () => clearInterval(cleanupInterval);
	}, []); // Empty dependency array to avoid infinite loops

	// Handle timeout countdown
	useEffect(() => {
		if (timeoutRemaining > 0) {
			const timer = setTimeout(() => {
				setTimeoutRemaining((prev) => Math.max(0, prev - 1));
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [timeoutRemaining]);

	// Start timeout after sending message
	const startTimeout = () => {
		setTimeoutRemaining(MESSAGE_TIMEOUT_SECONDS);

		// Add to hourly tracking
		setHourlyMessages((prev) => [...prev, Date.now()]);
	};

	// Handle send message with rate limiting
	const handleSendMessage = () => {
		if (canSendMessage) {
			onSendMessage();
			startTimeout();
		}
	};

	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = Math.min(textarea.scrollHeight, 80) + "px";
		}
	}, []);

	useEffect(() => {
		adjustTextareaHeight();
	}, [newMessage, adjustTextareaHeight]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Get status message
	const getStatusMessage = () => {
		if (timeoutRemaining > 0) {
			return `انتظر ${timeoutRemaining} ثانية قبل الرسالة التالية`;
		}
		if (hourlyMessages.length >= MAX_MESSAGES_PER_HOUR) {
			return `لقد وصلت للحد الأقصى (${MAX_MESSAGES_PER_HOUR} رسالة في الساعة)`;
		}
		return `اضغط Enter للإرسال، Shift+Enter للسطر الجديد (${newMessage.length}/${MAX_LENGTH})`;
	};

	// Get status color
	const getStatusColor = () => {
		if (timeoutRemaining > 0) {
			return "#FF6B6B"; // Red for timeout
		}
		if (hourlyMessages.length >= MAX_MESSAGES_PER_HOUR) {
			return "#FF6B6B"; // Red for limit reached
		}
		return "#0143EB"; // Blue for normal
	};

	return (
		<div
			className="border-t p-2 flex-shrink-0 font-mono"
			style={{ backgroundColor: "#F3F3F3", borderTopColor: "#000000" }}
		>
			<div className="flex gap-2 items-end">
				<textarea
					ref={textareaRef}
					value={newMessage}
					onChange={(e) => {
						if (e.target.value.length <= MAX_LENGTH) {
							setNewMessage(e.target.value);
						}
					}}
					onKeyDown={handleKeyPress}
					placeholder={
						timeoutRemaining > 0
							? `انتظر ${timeoutRemaining} ثانية...`
							: "اكتب رسالتك هنا..."
					}
					className="flex-1 resize-none px-2 py-1 text-sm border font-mono min-h-[28px] leading-5 focus:outline-none transition-colors"
					style={{
						borderColor: timeoutRemaining > 0 ? "#FF6B6B" : "#000000",
						backgroundColor: timeoutRemaining > 0 ? "#FFF5F5" : "#FFFFFF",
						color: "#000000",
					}}
					onFocus={(e) => {
						if (timeoutRemaining === 0) {
							e.target.style.borderColor = "#0143EB";
							e.target.style.backgroundColor = "#F3F3F3";
						}
					}}
					onBlur={(e) => {
						if (timeoutRemaining === 0) {
							e.target.style.borderColor = "#000000";
							e.target.style.backgroundColor = "#FFFFFF";
						}
					}}
					rows={1}
					aria-label="كتابة رسالة جديدة"
					maxLength={MAX_LENGTH}
					disabled={timeoutRemaining > 0}
				/>
				<button
					onClick={handleSendMessage}
					disabled={!canSendMessage}
					className="px-3 py-1 text-sm flex-shrink-0 transition-colors border font-bold tracking-wide uppercase font-mono"
					style={{
						backgroundColor: canSendMessage ? "#0143EB" : "#F3F3F3",
						color: canSendMessage ? "#FFFFFF" : "#000000",
						borderColor: "#000000",
						cursor: canSendMessage ? "pointer" : "not-allowed",
						opacity: canSendMessage ? 1 : 0.6,
					}}
					onMouseEnter={(e) => {
						if (canSendMessage) {
							(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
							(e.target as HTMLButtonElement).style.color = "#FFFFFF";
						}
					}}
					onMouseLeave={(e) => {
						if (canSendMessage) {
							(e.target as HTMLButtonElement).style.backgroundColor = "#0143EB";
							(e.target as HTMLButtonElement).style.color = "#FFFFFF";
						}
					}}
					aria-label="إرسال الرسالة"
				>
					إرسال
				</button>
			</div>
			<div
				className="text-xs mt-1 text-center font-mono"
				style={{ color: getStatusColor() }}
			>
				{getStatusMessage()}
			</div>
			{hourlyMessages.length > 0 && (
				<div
					className="text-xs mt-1 text-center font-mono"
					style={{ color: "#666666" }}
				>
					{`الرسائل في الساعة: ${hourlyMessages.length}/${MAX_MESSAGES_PER_HOUR}`}
				</div>
			)}
		</div>
	);
}
