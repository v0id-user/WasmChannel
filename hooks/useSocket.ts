"use client";

import { useEffect, useRef } from "react";
import { useBoot } from "@/components/providers/BootProvider";

export function useSocket() {
  const { isReady, state } = useBoot();
  const socketRef = useRef<WebSocket | null>(null);
  const connectionStartedRef = useRef(false);
  
  useEffect(() => {
    // Only connect when fully ready and not already connected
    if (!isReady || connectionStartedRef.current || socketRef.current) {
      return;
    }
    
    console.log("WEBSOCKET: Starting connection...");
    connectionStartedRef.current = true;
    
    const connectWebSocket = () => {
      try {
        const wsUrl = `${process.env.NEXT_PUBLIC_WORKER_CHAT}`;
        console.log("WEBSOCKET: Connecting to:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WEBSOCKET: Connected successfully");
          socketRef.current = ws;
        };
        
        ws.onclose = (event) => {
          console.log("WEBSOCKET: Connection closed", event);
          socketRef.current = null;
          connectionStartedRef.current = false; // Allow reconnection
        };
        
        ws.onerror = (error) => {
          console.error("WEBSOCKET: Connection error", error);
          socketRef.current = null;
          connectionStartedRef.current = false; // Allow retry
        };
        
        // DO NOT handle onmessage here - that's the responsibility of chat components
        
      } catch (error) {
        console.error("WEBSOCKET: Failed to create connection", error);
        connectionStartedRef.current = false; // Allow retry
      }
    };
    
    connectWebSocket();
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        console.log("WEBSOCKET: Cleaning up connection");
        socketRef.current.close();
        socketRef.current = null;
      }
      connectionStartedRef.current = false;
    };
  }, [isReady, state.userId, state.fingerprint]);
  
  return socketRef.current;
} 