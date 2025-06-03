import { WasmPacket } from "@/oop";
import { create } from "zustand";

interface RoomStore {
	onlineUsers: number;
	messages: WasmPacket[];
	socket: WebSocket | null;
	connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
	setOnlineUsers: (onlineUsers: number) => void;
	setMessages: (messages: WasmPacket[]) => void;
	setSocket: (socket: WebSocket | null) => void;
	setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
	onlineUsers: 0,
	messages: [],
	socket: null,
	connectionStatus: 'disconnected' as const,
	setOnlineUsers: (onlineUsers: number) => set({ onlineUsers }),
	setMessages: (messages: WasmPacket[]) => set({ messages }),
	setSocket: (socket: WebSocket | null) => set({ socket }),
	setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
