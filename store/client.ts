"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { compressToBase64, decompressFromBase64 } from "lz-string";

const MAGIC_MARKER = "$:";

interface Me {
	fingerprint: string;
	userId: string;
}

interface Store {
	ws: WebSocket | null;
	setWs: (ws: WebSocket | null) => void;
	me: Me | null;
	setMe: (me: Me | null) => void;
	bootstrapped: boolean;
	setBootstrapped: (bootstrapped: boolean) => void;
}

// Custom storage with compression and base64 encoding
const compressedStorage = {
	getItem: (name: string) => {
		if (typeof window === "undefined") return null;
		try {
			const value = localStorage.getItem(name);
			if (!value) return null;

			if (value.startsWith(MAGIC_MARKER)) {
				const compressedData = value.substring(MAGIC_MARKER.length);
				const decompressed = decompressFromBase64(compressedData);
				if (decompressed) {
					return JSON.parse(decompressed);
				}
			}

			if (value.startsWith("{") && value.includes('"state"')) {
				try {
					return JSON.parse(value);
				} catch {
					return null;
				}
			}

			localStorage.removeItem(name);
			return null;
		} catch (error) {
			console.error("Failed to retrieve data:", error);
			try {
				localStorage.removeItem(name);
			} catch {}
			return null;
		}
	},

	setItem: (name: string, value: any) => {
		try {
			const stringValue = JSON.stringify(value);
			const compressed = MAGIC_MARKER + compressToBase64(stringValue);
			localStorage.setItem(name, compressed);
		} catch (error) {
			console.error("Failed to compress data, storing uncompressed:", error);
			try {
				localStorage.setItem(name, JSON.stringify(value));
			} catch (e) {
				console.error("Failed to store data:", e);
			}
		}
	},

	removeItem: (name: string) => {
		try {
			localStorage.removeItem(name);
		} catch (error) {
			console.error("Failed to remove item:", error);
		}
	},
};

// Clear corrupted storage on init
if (typeof window !== "undefined") {
	try {
		const storeKey = "client-store";
		const value = localStorage.getItem(storeKey);
		if (value && !value.startsWith(MAGIC_MARKER) && !value.startsWith("{")) {
			localStorage.removeItem(storeKey);
			console.log("Cleared corrupted storage");
		}
	} catch {}
}

export const useStoreClient = create<Store>()(
	persist(
		(set) => ({
			ws: null,
			setWs: (ws: WebSocket | null) => set({ ws }),
			me: null,
			setMe: (me: Me | null) => set({ me }),
			bootstrapped: false,
			setBootstrapped: (bootstrapped: boolean) => set({ bootstrapped }),
		}),
		{
			name: "client-store",
			storage: compressedStorage,
		},
	),
);
