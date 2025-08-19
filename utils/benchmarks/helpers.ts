import { nanoid } from "nanoid";
import type { PayloadSize, BenchmarkMode } from "@/types/benchmark";

// Generate random payload of specified size
export const generateRandomPayload = (size: PayloadSize): Uint8Array => {
	let byteLength: number;
	switch (size) {
		case "11b":
			byteLength = 11;
			break;
		case "2kb":
			byteLength = 2048;
			break;
		case "10kb":
			byteLength = 10240;
			break;
	}

	// Generate random bytes (simulating real data)
	const payload = new Uint8Array(byteLength);
	for (let i = 0; i < byteLength; i++) {
		payload[i] = Math.floor(Math.random() * 256);
	}
	return payload;
};

// Generate fake message data using nanoid
export const generateFakeMessageData = () => ({
	messageId: nanoid(),
	userId: nanoid(8),
	content: nanoid(32),
});

export const getModeDescription = (mode: BenchmarkMode) => {
	switch (mode) {
		case "unfair":
			return "Unfair: WASM (always compressed+CRC+bincode) vs JSON (basic)";
		case "raw":
			return "Not possible: Rust WASM always uses compression (baked in code)";
		case "compressed":
			return "Fair: Both use compression+CRC - equivalent work complexity";
	}
};
