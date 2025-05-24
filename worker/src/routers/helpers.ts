import { base } from "../contexts";

export const ping = base.handler(async () => "ping");
export const pong = base.handler(async () => "pong");
