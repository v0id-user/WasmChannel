"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "whatInTheWorldIsThis_seen";
const SEEN_TIME_KEY = "whatInTheWorldIsThis_seen_time";
const ONE_HOUR = 60 * 60 * 1000;

export default function WhatInTheWorldIsThis() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const lastSeen = localStorage.getItem(SEEN_TIME_KEY);
		const now = Date.now();

		if (!lastSeen || now - Number(lastSeen) > ONE_HOUR) {
			setOpen(true);
		}
	}, []);

	const handleClose = () => {
		setOpen(false);
		localStorage.setItem(SEEN_KEY, "true");
		localStorage.setItem(SEEN_TIME_KEY, Date.now().toString());
	};

	if (!open) return null;

	return (
		<div
			dir="rtl"
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={{
				background: "rgba(0,0,0,0.15)",
				fontFamily: "var(--font-ibm-plex-sans-arabic), monospace, sans-serif",
			}}
		>
			<div
				className="w-full max-w-xs sm:max-w-sm md:max-w-md border-[0.5px] flex flex-col relative font-mono"
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
						ما هذا؟
					</span>
				</div>
				{/* Content */}
				<div className="flex-1 p-4 text-right">
					<p
						className="mb-4 text-xs leading-relaxed break-words"
						style={{
							color: "#222",
							whiteSpace: "pre-line",
							wordBreak: "break-word",
						}}
					>
						{"حياك، هذي تجربة بنيتها انا #V0ID\n" +
						"اختبر فيها ميزات لغة البرمجة Rust\n" +
						"وطريقة تفاعلها عند بنائها كـ WebAssembly\n" +
						"مع الـ Frontend والـ Backend.\n\n" +
						"كذلك اختبر في هذي التجربة البنية التحتية الخاصة بـ Cloudflare\n" +
						"عن طريق استغلالي لجميع الخدمات المقدمة منهم مثل:\n" +
						"Workers, KV, D1, Queues.\n\n" +
						"أتحدث بتفصيل أكثر في منشورات اضع لك روابطها في الاسفل."}
					</p>
					<ul className="mb-6 list-disc pr-6 text-xs" style={{ color: "#222" }}>
						{[
							{
								href: "https://x.com/v0id_user/status/1935125510700343652",
								label: "منشور اساسي عن المشروع",
							},
							{
								href: "https://x.com/v0id_user/status/1935170771032178913",
								label: "اختياري ل KV كان خاطئ ولماذا Redis كانت ستكون خيار افضل",
							},
							{
								href: "https://x.com/v0id_user/status/1935250850953211964",
								label: "كيف تعمل الرسائل المرسلة من المستخدمين",
							},
						].map(({ href, label }) => (
							<li key={href}>
								<a
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									className="underline hover:text-blue-700 transition"
									style={{ color: "#0143EB" }}
								>
									{label}
								</a>
							</li>
						))}
					</ul>
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
							حسناً، فهمت
						</button>
					</div>
				</div>
				{/* Footer / Socials */}
				<div
					className="border-t-[0.5px] px-4 py-3 text-xs text-right"
					style={{
						borderTopColor: "#222",
						background: "#F4F4F4",
						color: "#222",
						fontFamily: "inherit",
					}}
				>
					<div className="mb-2 font-bold" style={{ color: "#222" }}>
						تابعني على منصاتي
					</div>
					<div className="flex flex-col gap-1 text-xs" style={{ direction: "ltr", textAlign: "left" }}>
						<a
							href="https://x.com/v0id_user"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							x.com/v0id_user
						</a>
						<a
							href="https://instagram.com/v0id_user"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							instagram.com/v0id_user
						</a>
						<a
							href="https://github.com/v0id-user"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							github.com/v0id-user
						</a>
						<a
							href="https://reddit.com/u/v0id_user"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							reddit.com/v0id_user
						</a>
						<a
							href="https://gpg.v0id.me"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							GPG: gpg.v0id.me
						</a>
                        <a
							href="https://gpg.v0id.me"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline hover:text-black transition"
							style={{ color: "#333" }}
						>
							www.v0id.me
						</a>
						<div className="mt-1" style={{ color: "#333", fontFamily: "monospace", fontSize: "0.85em" }}>
							Email: <a href="mailto:hey@v0id.me" className="hover:underline" style={{ color: "#0143EB" }}>hey@v0id.me</a>
							{" | "}
							<span title="أي بريد على v0id.me سيصلني 😁">anything(at)v0id.me</span>
							<span className="ml-1" style={{ color: "#888" }}>will end up in my inbox :P</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}