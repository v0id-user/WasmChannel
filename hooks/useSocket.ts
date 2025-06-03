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
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'wss://localhost:3001'}/ws?uid=${state.userId}&fp=${state.fingerprint}`;
        console.log("WEBSOCKET: Connecting to:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log("WEBSOCKET: Connected successfully");
          socketRef.current = ws;
        };
        
        ws.onclose = (event) => {
          console.log("WEBSOCKET: Connection closed", event);
          socketRef.current = null;
        };
        
        ws.onerror = (error) => {
          console.error("WEBSOCKET: Connection error", error);
          socketRef.current = null;
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WEBSOCKET: Received message", data);
            // Handle incoming messages here
          } catch (error) {
            console.error("WEBSOCKET: Failed to parse message", error);
          }
        };
        
      } catch (error) {
        console.error("WEBSOCKET: Failed to create connection", error);
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
    };
  }, [isReady, state.userId, state.fingerprint]);
  
  return socketRef.current;
} 