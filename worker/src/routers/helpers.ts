import { base } from "~/contexts";

export const ping = base.route({ method: "GET" }).handler(async () => "ping");
export const pong = base.route({ method: "GET" }).handler(async () => "pong");
