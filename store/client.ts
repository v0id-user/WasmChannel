"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { compressToBase64, decompressFromBase64 } from "lz-string";

const MAGIC_MARKER = "$:";

interface Me {
	fingerprint: string;
	userId: string;
}

type LoadingStep = 
	| "initializing"
	| "wasm-loading"
	| "wasm-ready"
	| "auth-fingerprint"
	| "auth-signin"
	| "auth-signup"
	| "auth-ready"
	| "websocket-connecting"
	| "websocket-ready"
	| "complete";

interface LoadingState {
	step: LoadingStep;
	message: string;
	error?: string;
}

interface Store {
	ws: WebSocket | null;
	setWs: (ws: WebSocket | null) => void;
	me: Me | null;
	setMe: (me: Me | null) => void;
	bootstrapped: boolean;
	setBootstrapped: (bootstrapped: boolean) => void;
	loadingState: LoadingState;
	setLoadingState: (state: Partial<LoadingState>) => void;
}

// Arabic messages for each step
const LOADING_MESSAGES: Record<LoadingStep, string> = {
	"initializing": "بدء تشغيل التطبيق...",
	"wasm-loading": "تحميل الوحدات المطلوبة...",
	"wasm-ready": "تم تحميل الوحدات بنجاح",
	"auth-fingerprint": "إنشاء هوية فريدة...",
	"auth-signin": "محاولة تسجيل الدخول...",
	"auth-signup": "إنشاء حساب جديد...",
	"auth-ready": "تم التحقق من الهوية",
	"websocket-connecting": "الاتصال بالخادم...",
	"websocket-ready": "تم الاتصال بنجاح",
	"complete": "مرحباً بك!"
};

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
		(set, get) => ({
			ws: null,
			setWs: (ws: WebSocket | null) => set({ ws }),
			me: null,
			setMe: (me: Me | null) => set({ me }),
			bootstrapped: false,
			setBootstrapped: (bootstrapped: boolean) => set({ bootstrapped }),
			loadingState: {
				step: "initializing",
				message: LOADING_MESSAGES["initializing"]
			},
			setLoadingState: (state: Partial<LoadingState>) => {
				const currentState = get().loadingState;
				const newStep = state.step || currentState.step;
				const newState = {
					...currentState,
					...state,
					message: state.message || LOADING_MESSAGES[newStep]
				};
				
				// Log the state change
				console.log(`LOADING STATE: Changed from ${currentState.step} to ${newStep}`, {
					message: newState.message,
					error: newState.error
				});
				
				set({ loadingState: newState });
			},
		}),
		{
			name: "client-store",
			storage: compressedStorage,
		},
	),
);
