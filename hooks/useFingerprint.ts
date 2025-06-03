"use client";

import { useEffect, useRef } from "react";
import { useBoot } from "@/components/providers/BootProvider";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { nanoid } from "nanoid";
// Browser fingerprinting function
async function generateFingerprint(): Promise<string> {
	// Check if fingerprint exists in local storage
	const storedFingerprint = localStorage.getItem("fp_pls_no_touch_dookie_🥺");

	// If fingerprint exists, return it
	if (storedFingerprint) {
		return Promise.resolve(storedFingerprint);
	}

	// Generate new fingerprint if none exists
	const basefingerPrint = await getFingerprint();
	const uniqueId = nanoid();
	const newFingerprint = `${basefingerPrint}-${uniqueId}`;

	// Store new fingerprint in local storage
	localStorage.setItem("fp_pls_no_touch_dookie_🥺", newFingerprint);

	return Promise.resolve(newFingerprint);
}

export function useFingerprint() {
	const { state, dispatch } = useBoot();
	const fingerprintStartedRef = useRef(false);

	useEffect(() => {
		console.log("FINGERPRINT: useEffect triggered", {
			step: state.step,
			fingerprintStarted: fingerprintStartedRef.current,
			existingFingerprint: state.fingerprint,
		});

		// Only run after WASM is ready and we haven't started fingerprinting yet
		if (
			state.step !== "wasm-ready" ||
			fingerprintStartedRef.current ||
			state.fingerprint
		) {
			console.log("FINGERPRINT: Skipping due to conditions", {
				stepNotWasmReady: state.step !== "wasm-ready",
				alreadyStarted: fingerprintStartedRef.current,
				alreadyHasFingerprint: !!state.fingerprint,
			});
			return;
		}

		console.log("FINGERPRINT: Starting generation...");
		fingerprintStartedRef.current = true;
		dispatch({ type: "START_FINGERPRINT" });

		generateFingerprint()
			.then((fingerprint) => {
				console.log("FINGERPRINT: Generated successfully:", fingerprint);
				dispatch({ type: "FINGERPRINT_READY", payload: fingerprint });
			})
			.catch((error) => {
				console.error("FINGERPRINT: Generation failed:", error);
				dispatch({
					type: "FINGERPRINT_ERROR",
					payload: error.message || "Failed to generate fingerprint",
				});
			});
	}, [state.step, state.fingerprint, dispatch]);
}
