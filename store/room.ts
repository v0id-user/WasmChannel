import { WasmPacket } from "@/oop";
import { create } from "zustand";

interface RoomStore {
	onlineUsers: number;
	messages: WasmPacket[];
	setOnlineUsers: (onlineUsers: number) => void;
	setMessages: (messages: WasmPacket[]) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
	onlineUsers: 0,
	messages: [],
	setOnlineUsers: (onlineUsers: number) => set({ onlineUsers }),
	setMessages: (messages: WasmPacket[]) => set({ messages }),
}));
