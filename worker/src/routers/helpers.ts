import { base } from "~/contexts";
import { z } from "zod";

const HealthCheckResponse = z.object({
	status: z.literal("ok"),
	timestamp: z.string(),
});

export const ping = base
	.route({
		summary: "Health check endpoint",
		description:
			"Simple health check endpoint that returns server status and current timestamp",
		tags: ["health"],
		successDescription: "Returns server status and current timestamp",
	})
	.output(HealthCheckResponse)
	.handler(async () => {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
		};
	});
