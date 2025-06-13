import { oc } from "@orpc/contract";
import { z } from "zod";
import { PacketKind, ReactionKind } from "@/public/wasm/wasmchannel";

const messagesInput = z.object({
	cursor: z.string().optional(),
	limit: z.number().optional(),
});

export interface Message {
	message: string;
	id: string;
	createdAt: Date;
	updatedAt: Date;
	refrenceId: string;
	kind: PacketKind;
	reactionKind: ReactionKind | null;
	reactions: {
		kind: ReactionKind;
		count: number;
		users: string[];
	}[];
	sentBy: string;
	deletedAt: Date | null;
}
const messagesOutput = z.object({
	messages: z.array(z.custom<Message>()),
	source: z.enum(["cache", "database", "cache+database"]).optional(),
	error: z.string().optional(),
});

const errorContract = oc.errors({
	Unauthorized: {
		status: 401,
		message: "You must be authenticated to access this resource.",
	},
});

export const getMessagesContract = errorContract
	.input(messagesInput)
	.output(messagesOutput);

export const contract = {
	messages: {
		get: getMessagesContract,
	},
};

export type Contract = typeof contract;
