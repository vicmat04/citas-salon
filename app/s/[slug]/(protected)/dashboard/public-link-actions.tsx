"use client";

import * as React from "react";
import { Copy, ExternalLink, Link as LinkIcon, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export function resolvePublicUrl(href: string, origin: string) {
	return new URL(href, origin).toString();
}

export function supportsWebShare(
	navigatorLike: { share?: unknown } | undefined,
) {
	return typeof navigatorLike?.share === "function";
}

type CopyPublicUrlDependencies = {
	clipboardWriteText?: (text: string) => Promise<void>;
	fallbackCopy?: (text: string) => boolean;
};

export async function copyPublicUrl(
	url: string,
	{ clipboardWriteText, fallbackCopy }: CopyPublicUrlDependencies,
) {
	if (clipboardWriteText) {
		await clipboardWriteText(url);
		return true;
	}

	return fallbackCopy?.(url) === true;
}

type SharePublicUrlDependencies = {
	share?: (data: { title: string; url: string }) => Promise<void>;
};

export async function sharePublicUrl(
	url: string,
	{ share }: SharePublicUrlDependencies,
) {
	if (!share) return "unsupported" as const;

	try {
		await share({ title: "Reservas", url });
		return "shared" as const;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return "aborted" as const;
		}
		return "failed" as const;
	}
}

export function PublicLinkActions({ href }: { href: string }) {
	const [copyStatus, setCopyStatus] = React.useState("");

	const publicUrl = () => resolvePublicUrl(href, window.location.origin);

	async function copyPublicLink() {
		try {
			const copied = await copyPublicUrl(publicUrl(), {
				clipboardWriteText: navigator.clipboard?.writeText.bind(
					navigator.clipboard,
				),
				fallbackCopy: (url) => {
					const textArea = document.createElement("textarea");
					textArea.value = url;
					textArea.style.position = "fixed";
					textArea.style.opacity = "0";
					document.body.appendChild(textArea);
					textArea.select();
					const didCopy = document.execCommand("copy");
					textArea.remove();
					return didCopy;
				},
			});

			setCopyStatus(copied ? "Enlace copiado" : "No se pudo copiar el enlace");
		} catch {
			setCopyStatus("No se pudo copiar el enlace");
		}
	}

	async function sharePublicLink() {
		const result = await sharePublicUrl(publicUrl(), {
			share: supportsWebShare(navigator)
				? navigator.share.bind(navigator)
				: undefined,
		});

		if (result === "unsupported") {
			setCopyStatus("Tu navegador no permite compartir, pero sí copiar");
		}
		if (result === "failed") {
			setCopyStatus("No se pudo compartir el enlace");
		}
	}

	return (
		<Dialog>
			<DialogTrigger
				render={
					<Button variant="outline" size="sm" className="w-full sm:w-auto" />
				}
			>
				<LinkIcon />
				Enlace público
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Enlace público</DialogTitle>
					<DialogDescription>
						Comparte este enlace para que tus clientes puedan reservar una cita.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 sm:grid-cols-2">
					<Button onClick={copyPublicLink}>
						<Copy />
						Copiar enlace
					</Button>
					<Button variant="outline" onClick={sharePublicLink}>
						<Share2 />
						Compartir
					</Button>
					<Button
						variant="outline"
						className="sm:col-span-2"
						render={<a href={href} target="_blank" rel="noreferrer" />}
					>
						<ExternalLink />
						Abrir reservas
					</Button>
				</div>
				<p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
					{copyStatus}
				</p>
			</DialogContent>
		</Dialog>
	);
}
