"use client";
import { useFingerprint } from "@/hooks/useFingerprint";
export default function Fingerprint() {
	const { fingerprint, isCollecting } = useFingerprint();

	return (
		<div>
			<h1>Fingerprint</h1>
			<p>{fingerprint}</p>
			<p>{isCollecting ? "Collecting..." : "Collected"}</p>
		</div>
	);
}
