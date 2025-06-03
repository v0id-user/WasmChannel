"use client";
import { useBoot } from "@/components/providers/BootProvider";

export default function Fingerprint() {
	const { state } = useBoot();

	return (
		<div className="p-8" dir="rtl">
			<h1 className="text-2xl font-bold mb-4">بصمة المتصفح</h1>
			<div className="space-y-2">
				<p>
					<strong>الحالة:</strong> {state.step}
				</p>
				<p>
					<strong>الرسالة:</strong> {state.message}
				</p>
				{state.fingerprint && (
					<p>
						<strong>البصمة:</strong> {state.fingerprint}
					</p>
				)}
				{state.error && (
					<p className="text-red-600">
						<strong>خطأ:</strong> {state.error}
					</p>
				)}
			</div>
		</div>
	);
}
