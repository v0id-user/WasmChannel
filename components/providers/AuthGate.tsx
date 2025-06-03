"use client";

import { useFingerprint } from "@/hooks/useFingerprint";
import { useAuth } from "@/hooks/useAuth";

export function AuthGate() {
  useFingerprint();
  useAuth();
  return null;
} 