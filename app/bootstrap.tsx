"use client";
import { useStore } from "@/store/store";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";
import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";

export default function ClientBootstrap() {
	const { isAllowed, setClientId, setWs } = useStore();

	useEffect(() => {
		async function main() {
			// 1- Get the user browser fingerprint
			const fingerprint = await getFingerprint();

			// 1.1- Authenticate the user anonymously
			const authResponse = await authClient.signUp.email({
				email: `${fingerprint}@wasm.channel.com`,
				password: fingerprint,
				name: fingerprint,
			});
		}
		main();
	}, []);

	return <></>;
}
