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
			textarea.style.height = Math.min(textarea.scrollHeight, 96) + "px";
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
		<div className="bg-gray-100 border-t border-gray-200 p-3 rounded-b-lg flex-shrink-0">
			<div className="flex gap-2 items-end">
				<textarea
					ref={textareaRef}
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					onKeyDown={handleKeyPress}
					placeholder="اكتب رسالتك هنا..."
					className="flex-1 resize-none px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[36px] leading-5"
					rows={1}
					aria-label="كتابة رسالة جديدة"
				/>
				<button
					onClick={onSendMessage}
					disabled={!newMessage.trim()}
					className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
					aria-label="إرسال الرسالة"
				>
					إرسال
				</button>
			</div>
			<div className="text-xs text-gray-500 mt-1 text-center">
				اضغط Enter للإرسال، Shift+Enter للسطر الجديد
			</div>
		</div>
	);
}
