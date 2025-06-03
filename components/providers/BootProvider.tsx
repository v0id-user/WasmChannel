"use client";

import React, { createContext, useContext, useReducer } from "react";

export type BootStep =
	| "initializing"
	| "wasm-loading"
	| "wasm-ready"
	| "fingerprinting"
	| "signing-in"
	| "ready"
	| "error";

export type BootState = {
	step: BootStep;
	message: string;
	error?: string;
	fingerprint?: string;
	userId?: string;
	wasmReady: boolean;
	authReady: boolean;
};

export type BootAction =
	| { type: "START_WASM" }
	| { type: "WASM_READY" }
	| { type: "WASM_ERROR"; payload: string }
	| { type: "START_FINGERPRINT" }
	| { type: "FINGERPRINT_READY"; payload: string }
	| { type: "FINGERPRINT_ERROR"; payload: string }
	| { type: "START_AUTH"; payload: string }
	| { type: "AUTH_READY"; payload: { userId: string } }
	| { type: "AUTH_ERROR"; payload: string }
	| { type: "RESET" };

// Arabic messages for each step
const STEP_MESSAGES: Record<BootStep, string> = {
	initializing: "بدء تشغيل التطبيق...",
	"wasm-loading": "تحميل الوحدات المطلوبة...",
	"wasm-ready": "تم تحميل الوحدات بنجاح",
	fingerprinting: "إنشاء هوية فريدة...",
	"signing-in": "محاولة تسجيل الدخول...",
	ready: "مرحباً بك!",
	error: "حدث خطأ أثناء التحميل",
};

const BootStateContext = createContext<BootState | null>(null);
const BootDispatchContext = createContext<React.Dispatch<BootAction> | null>(
	null,
);

/*
* Update the current state based on the action
*
*/
function bootReducer(state: BootState, action: BootAction): BootState {
	console.log(`BOOT: ${action.type}`, action);

	switch (action.type) {
		case "START_WASM":
			return {
				...state,
				step: "wasm-loading",
				message: STEP_MESSAGES["wasm-loading"],
				error: undefined,
			};

		case "WASM_READY":
			return {
				...state,
				wasmReady: true,
				step: "wasm-ready",
				message: STEP_MESSAGES["wasm-ready"],
			};

		case "WASM_ERROR":
			return {
				...state,
				step: "error",
				message: STEP_MESSAGES["error"],
				error: action.payload,
			};

		case "START_FINGERPRINT":
			return {
				...state,
				step: "fingerprinting",
				message: STEP_MESSAGES["fingerprinting"],
			};

		case "FINGERPRINT_READY":
			return {
				...state,
				fingerprint: action.payload,
				step: "signing-in",
				message: STEP_MESSAGES["signing-in"],
			};

		case "FINGERPRINT_ERROR":
			return {
				...state,
				step: "error",
				message: STEP_MESSAGES["error"],
				error: action.payload,
			};

		case "START_AUTH":
			return {
				...state,
				step: "signing-in",
				message: STEP_MESSAGES["signing-in"],
				fingerprint: action.payload,
			};

		case "AUTH_READY":
			return {
				...state,
				userId: action.payload.userId,
				authReady: true,
				step: "ready",
				message: STEP_MESSAGES["ready"],
			};

		case "AUTH_ERROR":
			return {
				...state,
				step: "error",
				message: STEP_MESSAGES["error"],
				error: action.payload,
			};

		case "RESET":
			return {
				step: "initializing",
				message: STEP_MESSAGES["initializing"],
				wasmReady: false,
				authReady: false,
			};

		default:
			return state;
	}
}

export const BootProvider = ({ children }: { children: React.ReactNode }) => {
	/**
	 * The name useReducer is a bit misleading(I hate react), it's not a hook, it's a function that returns a tuple of two elements:
	 * 1. The current state
	 * 2. The dispatch function
	 * 
	 * The dispatch function is used to dispatch actions to the reducer which will update the state
	 * 
	 */
	const [state, dispatch] = useReducer(bootReducer, {
		step: "initializing",
		message: STEP_MESSAGES["initializing"],
		wasmReady: false,
		authReady: false,
	});

	return (
		<BootDispatchContext.Provider value={dispatch}>
			<BootStateContext.Provider value={state}>
				{children}
			</BootStateContext.Provider>
		</BootDispatchContext.Provider>
	);
};

export function useBoot() {
	const state = useContext(BootStateContext);
	const dispatch = useContext(BootDispatchContext);

	if (!state || !dispatch) {
		throw new Error("useBoot must be used within a BootProvider");
	}

	return {
		state,
		dispatch,
		isReady: state.step === "ready",
		hasError: state.step === "error",
	};
}
