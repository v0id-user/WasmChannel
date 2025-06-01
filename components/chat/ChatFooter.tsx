export function ChatFooter() {
	return (
		<>
			{/* Navigation Links */}
			<div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
				<a href="#" className="hover:text-gray-700 transition-colors">
					سياسة الخصوصية
				</a>
				<span className="text-gray-300">•</span>
				<a href="#" className="hover:text-gray-700 transition-colors">
					شروط الخدمة
				</a>
				<span className="text-gray-300">•</span>
				<a href="#" className="hover:text-gray-700 transition-colors">
					ما هذا المشروع؟
				</a>
				<span className="text-gray-300">•</span>
				<a
					href="https://www.v0id.me"
					className="hover:text-gray-700 transition-colors"
				>
					موقعي الشخصي
				</a>
				<span className="text-gray-300">•</span>
				<a
					href="https://ko-fi.com/v0id_user"
					target="_blank"
					rel="noopener noreferrer"
					title="☕"
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="https://storage.ko-fi.com/cdn/cup-border.png"
						alt="Ko-fi"
						width={16}
						height={16}
					/>
				</a>
			</div>

			<div className="mt-2 text-xs text-gray-400 text-center">
				تجربة • WebAssembly + Next.js
			</div>
		</>
	);
}
