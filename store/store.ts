import { create } from "zustand";

interface Store {
	isAllowed: boolean;
	authClientId: string;
	setClientId: (clientId: string) => void;
	ws: WebSocket | null;
	setWs: (ws: WebSocket | null) => void;
}

export const useStore = create<Store>((set) => ({
	isAllowed: false,
	authClientId: "",
	setClientId: (clientId: string) => set({ authClientId: clientId }),
	ws: null,
	setWs: (ws: WebSocket | null) => set({ ws }),
}));
