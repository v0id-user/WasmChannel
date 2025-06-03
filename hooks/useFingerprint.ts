"use client";

import { useEffect, useRef } from "react";
import { useBoot } from "@/components/providers/BootProvider";

// Browser fingerprinting function
function generateFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      Object.keys(window).length
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    resolve(Math.abs(hash).toString(16).substring(0, 8));
  });
}

export function useFingerprint() {
  const { state, dispatch } = useBoot();
  const fingerprintStartedRef = useRef(false);
  
  useEffect(() => {
    console.log("FINGERPRINT: useEffect triggered", {
      step: state.step,
      fingerprintStarted: fingerprintStartedRef.current,
      existingFingerprint: state.fingerprint
    });
    
    // Only run after WASM is ready and we haven't started fingerprinting yet
    if (state.step !== "wasm-ready" || fingerprintStartedRef.current || state.fingerprint) {
      console.log("FINGERPRINT: Skipping due to conditions", {
        stepNotWasmReady: state.step !== "wasm-ready",
        alreadyStarted: fingerprintStartedRef.current,
        alreadyHasFingerprint: !!state.fingerprint
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
        dispatch({ type: "FINGERPRINT_ERROR", payload: error.message || "Failed to generate fingerprint" });
      });
  }, [state.step, state.fingerprint, dispatch]);
} 