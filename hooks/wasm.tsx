import { useState, useEffect } from "react";
import { initWasm } from "@/utils/wasm/init";

export function useWasmInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWasm()
      .then(() => {
        setIsReady(true);
        console.log("WASM initialized");
      })
      .catch((err) => {
        setError("Failed to initialize WASM module");
        console.error("WASM initialization error:", err);
      });
  }, []);

  return { isReady, error };
} 