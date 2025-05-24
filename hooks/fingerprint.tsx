"use client";

import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState } from "react";

export function useFingerprint() {
	const [fingerprint, setFingerprint] = useState<string | null>(null);
	const [isCollecting, setIsCollecting] = useState(false);
	useEffect(() => {
		setIsCollecting(true);
		getFingerprint().then((fingerprint) => {
			setFingerprint(fingerprint);
			setIsCollecting(false);
		});
	}, []);

	return { fingerprint, isCollecting };
}
