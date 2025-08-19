// JSON Protocol Implementation - Mirror of Rust packet.rs
export enum JsonPacketKind {
	Message = "Message",
	OnlineUsers = "OnlineUsers",
	Delete = "Delete",
	Reaction = "Reaction",
	Joined = "Joined",
	Typing = "Typing",
}

export enum JsonReactionKind {
	None = "None",
	Like = "Like",
	Dislike = "Dislike",
	Heart = "Heart",
	Star = "Star",
}

export interface PacketData {
	kind: JsonPacketKind;
	message_id?: string;
	user_id?: string;
	reaction_kind?: JsonReactionKind;
	payload: number[];
	serialized: boolean;
	crc: number;
}

// Compression utilities for fair comparison
export const compressData = (data: number[]): number[] => {
	// Simple RLE compression for demo (replace with actual LZ4 if available)
	const compressed: number[] = [];
	let count = 1;
	let current = data[0];

	for (let i = 1; i < data.length; i++) {
		if (data[i] === current && count < 255) {
			count++;
		} else {
			compressed.push(current, count);
			current = data[i];
			count = 1;
		}
	}
	compressed.push(current, count);
	return compressed;
};

export const decompressData = (compressed: number[]): number[] => {
	const decompressed: number[] = [];
	for (let i = 0; i < compressed.length; i += 2) {
		const byte = compressed[i];
		const count = compressed[i + 1];
		for (let j = 0; j < count; j++) {
			decompressed.push(byte);
		}
	}
	return decompressed;
};

export class JsonPacket {
	private data: PacketData;

	constructor(
		kind: JsonPacketKind,
		message_id?: string,
		user_id?: string,
		reaction_kind?: JsonReactionKind,
		payload: number[] = [],
		useCompression: boolean = false,
	) {
		const processedPayload = useCompression ? compressData(payload) : payload;
		const crc = this.calculateSimpleCrc32(processedPayload);

		this.data = {
			kind,
			message_id,
			user_id,
			reaction_kind,
			payload: processedPayload,
			serialized: false,
			crc,
		};
	}

	serialize(): string {
		const serializedData = { ...this.data, serialized: true };
		return JSON.stringify(serializedData);
	}

	static deserialize(
		jsonString: string,
		useCompression: boolean = false,
	): JsonPacket | null {
		try {
			const parsed = JSON.parse(jsonString) as PacketData;

			// Create packet with raw payload first
			const packet = new JsonPacket(
				parsed.kind,
				parsed.message_id,
				parsed.user_id,
				parsed.reaction_kind,
				useCompression ? decompressData(parsed.payload) : parsed.payload,
				false, // Don't re-compress
			);

			packet.data = { ...parsed, serialized: false };
			return packet;
		} catch {
			return null;
		}
	}

	getPayload(useCompression: boolean = false): number[] {
		return useCompression
			? decompressData(this.data.payload)
			: [...this.data.payload];
	}

	private calculateSimpleCrc32(data: number[]): number {
		let crc = 0xffffffff;
		for (const byte of data) {
			crc ^= byte;
			for (let i = 0; i < 8; i++) {
				crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
			}
		}
		return (crc ^ 0xffffffff) >>> 0;
	}
}
