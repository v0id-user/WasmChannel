import { useRef, useCallback, useEffect } from "react";

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
			onSendMessage();
		}
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
					onChange={(e) => setNewMessage(e.target.value)}
					onKeyDown={handleKeyPress}
					placeholder="اكتب رسالتك هنا..."
					className="flex-1 resize-none px-2 py-1 text-sm border font-mono min-h-[28px] leading-5 focus:outline-none transition-colors"
					style={{
						borderColor: "#000000",
						backgroundColor: "#FFFFFF",
						color: "#000000",
					}}
					onFocus={(e) => {
						e.target.style.borderColor = "#0143EB";
						e.target.style.backgroundColor = "#F3F3F3";
					}}
					onBlur={(e) => {
						e.target.style.borderColor = "#000000";
						e.target.style.backgroundColor = "#FFFFFF";
					}}
					rows={1}
					aria-label="كتابة رسالة جديدة"
				/>
				<button
					onClick={onSendMessage}
					disabled={!newMessage.trim()}
					className="px-3 py-1 text-sm flex-shrink-0 transition-colors border font-bold tracking-wide uppercase font-mono"
					style={{
						backgroundColor: newMessage.trim() ? "#0143EB" : "#F3F3F3",
						color: newMessage.trim() ? "#FFFFFF" : "#000000",
						borderColor: "#000000",
						cursor: newMessage.trim() ? "pointer" : "not-allowed",
					}}
					onMouseEnter={(e) => {
						if (newMessage.trim()) {
							(e.target as HTMLButtonElement).style.backgroundColor = "#000000";
							(e.target as HTMLButtonElement).style.color = "#FFFFFF";
						}
					}}
					onMouseLeave={(e) => {
						if (newMessage.trim()) {
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
				style={{ color: "#0143EB" }}
			>
				اضغط Enter للإرسال، Shift+Enter للسطر الجديد
			</div>
		</div>
	);
}
