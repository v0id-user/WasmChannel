"use client";

import { getFingerprint } from "@thumbmarkjs/thumbmarkjs";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

const XOR_KEY = 0x76306964;
const STORAGE_KEY = "fp_data";

// XOR encode/decode functions
function xorEncode(text: string, key: number): string {
	return text
		.split("")
		.map((char, index) => {
			const keyByte = (key >> ((index % 4) * 8)) & 0xff;
			return String.fromCharCode(char.charCodeAt(0) ^ keyByte);
		})
		.join("");
}

function xorDecode(encodedText: string, key: number): string {
	return xorEncode(encodedText, key); // XOR is symmetric
}

// Base64 encode/decode with proper handling
function encodeToStorage(data: string): string {
	const xorEncoded = xorEncode(data, XOR_KEY);
	return btoa(xorEncoded);
}

function decodeFromStorage(encodedData: string): string {
	try {
		const base64Decoded = atob(encodedData);
		return xorDecode(base64Decoded, XOR_KEY);
	} catch {
		return "";
	}
}

export function useFingerprint() {
	const [fingerprint, setFingerprint] = useState<string | null>(null);
	const [isCollecting, setIsCollecting] = useState(false);
	
	useEffect(() => {
		// Check if we already have a stored fingerprint
		const storedData = localStorage.getItem(STORAGE_KEY);
		
		if (storedData) {
			// Decode existing fingerprint from localStorage
			const decodedFingerprint = decodeFromStorage(storedData);
			if (decodedFingerprint) {
				setFingerprint(decodedFingerprint);
				return;
			}
		}
		
		// Generate new fingerprint if not found in storage
		setIsCollecting(true);
		getFingerprint().then((rawFingerprint) => {
			// Add nanoid to make it more unique (especially for Apple devices)
			const enhancedFingerprint = `${rawFingerprint}_${nanoid()}`;
			
			// Store in localStorage with XOR encoding and base64
			const encodedData = encodeToStorage(enhancedFingerprint);
			localStorage.setItem(STORAGE_KEY, encodedData);
			
			setFingerprint(enhancedFingerprint);
			setIsCollecting(false);
		});
	}, []);

	return { fingerprint, isCollecting };
}
