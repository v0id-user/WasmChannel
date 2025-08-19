export interface BenchmarkResult {
	rust: number;
	json: number;
	rustWinner: boolean;
	jsonWinner: boolean;
	mode: string;
	rustErrors: number;
	jsonErrors: number;
}

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

export interface LogEntry {
	timestamp: string;
	type: "info" | "success" | "error" | "warning";
	message: string;
	details?: {
		operations?: number;
		avgOpsPerSecond?: string;
		errors?: number;
		byteLength?: number;
		mode?: string;
		messageId?: string;
		userId?: string;
		serializedSize?: number;
		duration?: string;
		totalOperations?: number;
		opsPerSecond?: string;
		wasmWork?: string;
		jsonWork?: string;
		recommendation?: string;
		rustOps?: number;
		jsonOps?: number;
		advantage?: string;
		compression?: boolean;
	};
}

export type BenchmarkMode = "unfair" | "raw" | "compressed";
export type PayloadSize = "11b" | "2kb" | "10kb";
export type TestDuration = 5 | 10 | 15 | 30 | 60;
export type AutoRunCount = 5 | 10 | 20 | 50 | 100;
