"use client";
import { client } from "@/lib/orpc";
import { useEffect } from "react";

export default function P() {
	useEffect(() => {
		async function main() {
			const res = await client.ping();
			console.log(res);
		}
		main();
	}, []);

	return <div>P</div>;
}
