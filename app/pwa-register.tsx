"use client";

import { useEffect } from "react";

export function canRegisterServiceWorker(
	environment: string | undefined,
	protocol: string,
	serviceWorkerSupported: boolean,
) {
	return (
		environment === "production" &&
		protocol === "https:" &&
		serviceWorkerSupported
	);
}

export function PwaRegister() {
	useEffect(() => {
		if (
			!canRegisterServiceWorker(
				process.env.NODE_ENV,
				window.location.protocol,
				"serviceWorker" in navigator,
			)
		) {
			return;
		}

		void navigator.serviceWorker
			.register("/sw.js", { scope: "/" })
			.catch(() => {
				// Registration is progressive enhancement; the web app remains usable.
			});
	}, []);

	return null;
}
