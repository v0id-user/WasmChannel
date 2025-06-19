"use client";

import { memo, useState, useMemo } from "react";
import type { BenchmarkMode, PayloadSize } from "@/types/benchmark";

export interface ComparisonEntry {
	id: string;
	payloadSize: PayloadSize;
	mode: BenchmarkMode;
	rustOps: number;
	jsonOps: number;
	rustErrors?: number;
	jsonErrors?: number;
	timestamp: string;
}

interface BenchmarkComparisonTableProps {
	entries: ComparisonEntry[];
	onClear?: () => void;
}

const BenchmarkComparisonTable = memo(function BenchmarkComparisonTable({
	entries,
	onClear,
}: BenchmarkComparisonTableProps) {
	const [graphMode, setGraphMode] = useState(false);

	// Sort entries by payload size ascending
	const sortedEntries = useMemo(() => {
		const sizeOrder: Record<PayloadSize, number> = {
			'11b': 1,
			'2kb': 2,
			'10kb': 3,
		};
		
		return [...entries].sort((a, b) => {
			const sizeCompare = sizeOrder[a.payloadSize] - sizeOrder[b.payloadSize];
			if (sizeCompare !== 0) return sizeCompare;
			// Secondary sort by mode
			return a.mode.localeCompare(b.mode);
		});
	}, [entries]);

	const calculateAdvantage = (rustOps: number, jsonOps: number) => {
		if (rustOps === jsonOps) return { percentage: 0, winner: 'tie' as const };
		if (rustOps > jsonOps) {
			return {
				percentage: ((rustOps / jsonOps - 1) * 100),
				winner: 'rust' as const
			};
		} else {
			return {
				percentage: ((jsonOps / rustOps - 1) * 100),
				winner: 'json' as const
			};
		}
	};

	const getWinnerColor = (winner: 'rust' | 'json' | 'tie') => {
		switch (winner) {
			case 'rust': return '#00FF5F'; // Green for WASM advantage
			case 'json': return '#FF4444'; // Red for JSON advantage
			case 'tie': return '#FFB300'; // Orange for tie
		}
	};

	const formatPayloadSize = (size: PayloadSize) => {
		return size.toUpperCase();
	};

	const formatMode = (mode: BenchmarkMode) => {
		return mode.toUpperCase();
	};

	const formatNumber = (num: number) => {
		// Convert to integer and manually format with commas
		const cleanNum = Math.floor(Number(num) || 0);
		return cleanNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	};

	const BarChart = ({ rustOps, jsonOps }: { rustOps: number; jsonOps: number }) => {
		const maxOps = Math.max(rustOps, jsonOps);
		const rustWidth = (rustOps / maxOps) * 100;
		const jsonWidth = (jsonOps / maxOps) * 100;

		return (
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<div className="w-12 text-xs font-mono" style={{ color: "#000000" }}>🦀 RUST</div>
					<div className="flex-1 h-4 bg-gray-200 relative">
						<div
							className="h-full transition-all duration-300"
							style={{
								width: `${rustWidth}%`,
								backgroundColor: rustOps >= jsonOps ? "#00FF5F" : "#0143EB",
							}}
						/>
						<div className="absolute right-2 top-0 h-full flex items-center">
							<span className="text-xs font-mono font-bold" style={{ color: "#000000" }}>
								{formatNumber(rustOps)}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-12 text-xs font-mono" style={{ color: "#000000" }}>📄 JSON</div>
					<div className="flex-1 h-4 bg-gray-200 relative">
						<div
							className="h-full transition-all duration-300"
							style={{
								width: `${jsonWidth}%`,
								backgroundColor: jsonOps >= rustOps ? "#FF4444" : "#0143EB",
							}}
						/>
						<div className="absolute right-2 top-0 h-full flex items-center">
							<span className="text-xs font-mono font-bold" style={{ color: "#000000" }}>
								{formatNumber(jsonOps)}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	};

	if (entries.length === 0) {
		return (
			<div className="text-center p-8 border" style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}>
				<div className="text-lg font-mono font-bold mb-2" style={{ color: "#000000" }}>
					NO COMPARISON DATA
				</div>
				<div className="text-sm font-mono" style={{ color: "#0143EB" }}>
					Run benchmarks to see performance comparison
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-2xl font-bold font-mono tracking-wide" style={{ color: "#000000" }}>
						COMPARISON TABLE
					</div>
					<div className="px-2 py-1 text-xs border font-mono font-bold" style={{
						borderColor: "#000000",
						backgroundColor: "#FFFFFF",
						color: "#0143EB"
					}}>
						{entries.length} RESULTS
					</div>
				</div>
				
				<div className="flex items-center gap-2">
					{/* Graph Mode Toggle */}
					<button
						onClick={() => setGraphMode(!graphMode)}
						className="px-3 py-1 text-xs font-mono font-bold border transition-colors"
						style={{
							borderColor: "#000000",
							backgroundColor: graphMode ? "#0143EB" : "#F3F3F3",
							color: graphMode ? "#FFFFFF" : "#000000"
						}}
					>
						{graphMode ? "📊 GRAPH" : "📋 TABLE"}
					</button>

					{/* Clear Button */}
					{onClear && (
						<button
							onClick={onClear}
							className="px-3 py-1 text-xs font-mono font-bold border transition-colors hover:bg-red-100"
							style={{
								borderColor: "#000000",
								backgroundColor: "#F3F3F3",
								color: "#000000"
							}}
						>
							🗑️ CLEAR
						</button>
					)}
				</div>
			</div>

			{/* Table/Graph Content */}
			<div className="border" style={{ borderColor: "#000000", backgroundColor: "#F3F3F3" }}>
				{graphMode ? (
					/* Graph Mode */
					<div className="p-4 space-y-6">
						{sortedEntries.map((entry) => {
							const advantage = calculateAdvantage(entry.rustOps, entry.jsonOps);
							return (
								<div key={entry.id} className="border p-4" style={{ borderColor: "#000000", backgroundColor: "#FFFFFF" }}>
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2">
											<div className="px-2 py-1 text-xs font-mono font-bold border" style={{
												borderColor: "#000000",
												backgroundColor: "#F3F3F3",
												color: "#000000"
											}}>
												{formatPayloadSize(entry.payloadSize)}
											</div>
											<div className="px-2 py-1 text-xs font-mono font-bold border" style={{
												borderColor: "#000000",
												backgroundColor: entry.mode === 'unfair' ? "#FFB300" : "#F3F3F3",
												color: "#000000"
											}}>
												{formatMode(entry.mode)}
											</div>
										</div>
										
										<div className="text-sm font-mono font-bold" style={{
											color: getWinnerColor(advantage.winner)
										}}>
											{advantage.winner === 'tie' ? 'TIE' : 
											 advantage.winner === 'rust' ? `RUST +${advantage.percentage.toFixed(1)}%` :
											 `JSON +${advantage.percentage.toFixed(1)}%`}
										</div>
									</div>
									
									<BarChart rustOps={entry.rustOps} jsonOps={entry.jsonOps} />
								</div>
							);
						})}
					</div>
				) : (
					/* Table Mode */
					<table className="w-full text-sm font-mono">
						<thead>
							<tr style={{ backgroundColor: "#000000", color: "#FFFFFF" }}>
								<th className="p-2 text-left">SIZE</th>
								<th className="p-2 text-left">MODE</th>
								<th className="p-2 text-right">🦀 RUST</th>
								<th className="p-2 text-right">📄 JSON</th>
								<th className="p-2 text-center">WINNER</th>
								<th className="p-2 text-right">ADVANTAGE</th>
								<th className="p-2 text-center">TIME</th>
							</tr>
						</thead>
						<tbody>
							{sortedEntries.map((entry, index) => {
								const advantage = calculateAdvantage(entry.rustOps, entry.jsonOps);
								const isEvenRow = index % 2 === 0;
								
								return (
									<tr key={entry.id} style={{
										backgroundColor: isEvenRow ? "#FFFFFF" : "#F8F8F8"
									}}>
										<td className="p-2 font-bold" style={{ color: "#000000" }}>
											{formatPayloadSize(entry.payloadSize)}
										</td>
										<td className="p-2" style={{ 
											color: entry.mode === 'unfair' ? "#FFB300" : "#0143EB" 
										}}>
											{formatMode(entry.mode)}
										</td>
										<td className="p-2 text-right font-bold" style={{
											color: advantage.winner === 'rust' ? "#00FF5F" : "#000000"
										}}>
											{formatNumber(entry.rustOps)}
										</td>
										<td className="p-2 text-right font-bold" style={{
											color: advantage.winner === 'json' ? "#FF4444" : "#000000"
										}}>
											{formatNumber(entry.jsonOps)}
										</td>
										<td className="p-2 text-center font-bold" style={{
											color: getWinnerColor(advantage.winner)
										}}>
											{advantage.winner === 'tie' ? '🤝' : 
											 advantage.winner === 'rust' ? '🦀' : '📄'}
										</td>
										<td className="p-2 text-right font-bold" style={{
											color: getWinnerColor(advantage.winner)
										}}>
											{advantage.winner === 'tie' ? '0.0%' : `+${advantage.percentage.toFixed(1)}%`}
										</td>
										<td className="p-2 text-center text-xs" style={{ color: "#0143EB" }}>
											{new Date(entry.timestamp).toLocaleTimeString('en-US', {
												hour12: false,
												hour: '2-digit',
												minute: '2-digit',
												second: '2-digit'
											})}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>

			{/* Legend */}
			<div className="text-center text-xs font-mono space-y-1">
				<div style={{ color: "#000000" }}>
					<span style={{ color: "#00FF5F" }}>●</span> RUST ADVANTAGE{" "}
					<span style={{ color: "#FF4444" }}>●</span> JSON ADVANTAGE{" "}
					<span style={{ color: "#FFB300" }}>●</span> TIE/UNFAIR
				</div>
				<div style={{ color: "#0143EB" }}>
					CLICK GRAPH/TABLE TOGGLE TO SWITCH VIEWS • RESULTS SORTED BY PAYLOAD SIZE
				</div>
			</div>
		</div>
	);
});

export default BenchmarkComparisonTable; 