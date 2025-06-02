import ClientBootstrap from "@/app/bootstrap";
export default function ChatLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ClientBootstrap />
			{children}
		</>
	);
}
