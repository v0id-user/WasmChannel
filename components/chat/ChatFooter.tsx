export function ChatFooter() {
	const handleLinkHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
		(e.target as HTMLAnchorElement).style.color = "#0143EB";
	};

	const handleLinkLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
		(e.target as HTMLAnchorElement).style.color = "#000000";
	};

	const handleKofiHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
		const img = e.currentTarget.querySelector("img") as HTMLImageElement;
		if (img) {
			img.style.filter =
				"brightness(0) saturate(100%) invert(9%) sepia(96%) saturate(7471%) hue-rotate(233deg) brightness(90%) contrast(120%)";
		}
	};

	const handleKofiLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
		const img = e.currentTarget.querySelector("img") as HTMLImageElement;
		if (img) {
			img.style.filter = "brightness(0)";
		}
	};

	return (
		<>
			{/* Navigation Links */}
			<div
				className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-mono"
				style={{ color: "#000000" }}
			>
				<a
					href="https://github.com/v0id-user/WasmChannel"
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors font-mono"
					style={{ color: "#000000" }}
					onMouseEnter={handleLinkHover}
					onMouseLeave={handleLinkLeave}
				>
					ما هذا المشروع؟
				</a>
				<span style={{ color: "#0143EB" }}>•</span>
				<a
					href="https://www.v0id.me"
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors font-mono"
					style={{ color: "#000000" }}
					onMouseEnter={handleLinkHover}
					onMouseLeave={handleLinkLeave}
				>
					موقعي الشخصي
				</a>
				<span style={{ color: "#0143EB" }}>•</span>
				<a
					href="https://ko-fi.com/v0id_user"
					target="_blank"
					rel="noopener noreferrer"
					title="☕"
					className="transition-colors"
					onMouseEnter={handleKofiHover}
					onMouseLeave={handleKofiLeave}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="https://storage.ko-fi.com/cdn/cup-border.png"
						alt="Ko-fi"
						width={14}
						height={14}
					/>
				</a>
			</div>

			<div
				className="mt-1 text-xs text-center font-mono"
				style={{ color: "#0143EB" }}
			>
				تجربة • WebAssembly + Next.js + Cloudflare Services
			</div>
		</>
	);
}
