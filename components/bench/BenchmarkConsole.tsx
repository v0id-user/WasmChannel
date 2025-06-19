"use client";

import { memo, useRef, useEffect } from "react";
import type { LogEntry } from "@/types/benchmark";

interface BenchmarkConsoleProps {
	logs: LogEntry[];
	onClear: () => void;
}

const BenchmarkConsole = memo(function BenchmarkConsole({
	logs,
	onClear,
}: BenchmarkConsoleProps) {
	const logsEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Only scroll if logs have content and user hasn't manually scrolled up
		if (logs.length > 0) {
			// Use requestAnimationFrame for better performance during heavy updates
			requestAnimationFrame(() => {
				logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
			});
		}
	}, [logs.length]); // Only depend on length to avoid excessive re-renders

	const getLogIcon = (type: LogEntry['type']) => {
		switch (type) {
			case 'success': return '✅';
			case 'error': return '❌';
			case 'warning': return '⚠️';
			default: return 'ℹ️';
		}
	};

	return (
		<div className="bg-black border overflow-hidden" style={{ borderColor: "#000000" }}>
			<div className="px-4 py-2 flex justify-between items-center border-b" style={{ 
				backgroundColor: "#F3F3F3", 
				borderBottomColor: "#000000" 
			}}>
				<h3 className="font-bold font-mono tracking-wide" style={{ color: "#000000" }}>
					📊 BENCHMARK CONSOLE
				</h3>
				<button
					onClick={onClear}
					className="text-sm font-mono font-bold transition-colors border px-2 py-1"
					style={{
						color: "#000000",
						borderColor: "#000000",
						backgroundColor: "transparent"
					}}
					onMouseEnter={(e) => {
						(e.target as HTMLButtonElement).style.backgroundColor = "#0143EB";
						(e.target as HTMLButtonElement).style.color = "#FFFFFF";
					}}
					onMouseLeave={(e) => {
						(e.target as HTMLButtonElement).style.backgroundColor = "transparent";
						(e.target as HTMLButtonElement).style.color = "#000000";
					}}
				>
					CLEAR
				</button>
			</div>
			<div className="h-96 overflow-y-auto p-4 font-mono text-sm">
				{logs.length === 0 ? (
					<div style={{ color: "#0143EB" }}>READY TO START BENCHMARK...</div>
				) : (
					logs.map((log, index) => (
						<div key={`${log.timestamp}-${index}`} className="mb-2">
							<div className="flex items-start gap-2">
								<span className="text-xs mt-1 flex-shrink-0" style={{ color: "#0143EB" }}>
									{log.timestamp}
								</span>
								<span className="mt-1 flex-shrink-0">{getLogIcon(log.type)}</span>
								<span className="flex-1 break-words" style={{ color: "#FFFFFF" }}>
									{log.message}
								</span>
							</div>
							{log.details && (
								<div className="ml-20 mt-1 text-xs break-all" style={{ color: "#0143EB" }}>
									{JSON.stringify(log.details, null, 2)}
								</div>
							)}
						</div>
					))
				)}
				<div ref={logsEndRef} />
			</div>
		</div>
	);
});

export default BenchmarkConsole; 