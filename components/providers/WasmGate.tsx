"use client";

import { useInitWasm } from "@/hooks/useInitWasm";

export function WasmGate() {
  useInitWasm();
  return null;
} 