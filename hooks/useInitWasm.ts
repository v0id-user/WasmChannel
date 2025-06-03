"use client";

import { useEffect, useRef } from "react";
import { initWasm } from "@/utils/wasm/init";
import { useBoot } from "@/components/providers/BootProvider";

export function useInitWasm() {
  const { state, dispatch } = useBoot();
  const initStartedRef = useRef(false);
  
  useEffect(() => {
    // Only run if we're in the initializing state and haven't started yet
    if (state.step !== "initializing" || initStartedRef.current || state.wasmReady) {
      return;
    }
    
    console.log("WASM: Starting initialization...");
    initStartedRef.current = true;
    dispatch({ type: "START_WASM" });
    
    initWasm()
      .then(() => {
        console.log("WASM: Initialization completed successfully");
        dispatch({ type: "WASM_READY" });
      })
      .catch((error) => {
        console.error("WASM: Initialization failed:", error);
        dispatch({ type: "WASM_ERROR", payload: error.message || "Failed to initialize WASM" });
      });
  }, [state.step, state.wasmReady, dispatch]);
} 