"use client";

import { useSocket } from "@/hooks/useSocket";

export function SocketGate() {
  useSocket();
  return null;
} 