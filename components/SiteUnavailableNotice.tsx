"use client";

import { useEffect, useState } from "react";

interface SiteUnavailableNoticeProps {
	onClose?: () => void;
	harassmentLink?: string;
}

export default function SiteUnavailableNotice({
	onClose,
	harassmentLink = "https://x.com/v0id_user/status/1935639524782059884",
}: SiteUnavailableNoticeProps) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// Always show when component mounts
		setOpen(true);
	}, []);

	const handleClose = () => {
		setOpen(false);
		if (onClose) {
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div
			dir="rtl"
			className="fixed inset-0 z-[60] flex items-center justify-center"
			style={{
				background: "rgba(0,0,0,0.15)",
				fontFamily: "var(--font-ibm-plex-sans-arabic), monospace, sans-serif",
			}}
		>
			<div
				className="w-full max-w-xs sm:max-w-sm border-[0.5px] flex flex-col relative font-mono"
				style={{
					background: "#fff",
					borderColor: "#000",
					boxShadow: "0 2px 24px 0 rgba(0,0,0,0.12)",
					fontSize: "0.85rem",
				}}
			>
				{/* Header */}
				<div
					className="p-3 border-b-[0.5px] flex-shrink-0"
					style={{ background: "#F3F3F3", borderBottomColor: "#000" }}
				>
					<span
						className="text-lg font-black tracking-wide font-mono"
						style={{ color: "#000" }}
					>
						⚠️إشعار
					</span>
				</div>
				{/* Content */}
				<div className="flex-1 p-4 text-right">
					<p
						className="mb-4 text-sm leading-relaxed break-words"
						style={{
							color: "#222",
							whiteSpace: "pre-line",
							wordBreak: "break-word",
						}}
					>
						الموقع غير قابل للتجربة والاستكشاف حاليا بسبب بعض سوء الاستخدام و
						<a
							href={harassmentLink}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-blue-700 transition mx-1"
							style={{ color: "#0143EB" }}
						>
							المضايقات
						</a>
					</p>
					<div className="flex justify-end">
						<button
							onClick={handleClose}
							className="px-3 py-1 font-mono text-xs border transition-all duration-200 hover:scale-105 active:scale-95"
							style={{
								backgroundColor: "rgba(102, 102, 102, 0.15)",
								borderColor: "rgba(102, 102, 102, 0.3)",
								color: "#0143EB",
								backdropFilter: "blur(8px)",
							}}
						>
							فهمت
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
