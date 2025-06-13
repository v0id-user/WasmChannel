"use client";
// import { useQuery } from "@tanstack/react-query";
// import { orpc } from "@/lib/orpc";

export default function P() {
	// const { data, isPending, isError, error } = useQuery(
	// 	orpc.helper.ping.queryOptions({
	// 		refetchOnWindowFocus: false,
	// 		refetchOnMount: false,
	// 		refetchOnReconnect: false,
	// 		refetchInterval: false,
	// 		refetchIntervalInBackground: false,
	// 	}),
	// );

	// if (isPending) {
	// 	return <div>Loading...</div>;
	// }

	// if (isError) {
	// 	return <div>Error: {error?.message}</div>;
	// }

	return (
		<div>
			<h2>Ping Response:</h2>
			{/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
		</div>
	);
}
