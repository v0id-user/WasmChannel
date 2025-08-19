/* tslint:disable */
/* eslint-disable */
export function calculate_crc32(data: Uint8Array): number;
export enum PacketKind {
	Message = 0,
	OnlineUsers = 1,
	Delete = 2,
	Reaction = 3,
	Joined = 4,
	Typing = 5,
}
export enum ReactionKind {
	None = 0,
	Like = 1,
	Dislike = 2,
	Heart = 3,
	Star = 4,
}
export class WasmPacket {
	free(): void;
	constructor(
		kind: PacketKind,
		message_id: string | null | undefined,
		user_id: string | null | undefined,
		reaction_kind: ReactionKind | null | undefined,
		payload: Uint8Array,
	);
	serialized(): boolean;
	message_id(): string | undefined;
	user_id(): string | undefined;
	kind(): PacketKind;
	reaction_kind(): ReactionKind | undefined;
	payload(): Uint8Array;
	serialize(): Uint8Array;
	static deserialize(bytes: Uint8Array): WasmPacket;
}
