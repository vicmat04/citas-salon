"use client";

import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(onChange: () => void) {
	const mediaQuery = window.matchMedia(MOBILE_QUERY);
	mediaQuery.addEventListener("change", onChange);
	return () => mediaQuery.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
	return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

interface ResponsiveAppointmentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	trigger?: ReactElement;
	children: ReactNode;
	footer?: ReactNode;
}

export function ResponsiveAppointmentModal({
	open,
	onOpenChange,
	title,
	trigger,
	children,
	footer,
}: ResponsiveAppointmentModalProps) {
	const isMobile = useSyncExternalStore(
		subscribeToMobileQuery,
		getMobileSnapshot,
		getServerSnapshot,
	);

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				{trigger && <SheetTrigger render={trigger} />}
				<SheetContent
					side="bottom"
					className="max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-x px-0 pb-0 [&_[data-slot=sheet-close]]:min-h-11 [&_[data-slot=sheet-close]]:min-w-11"
				>
					<div
						aria-hidden="true"
						className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
					/>
					<SheetHeader className="shrink-0 border-b px-4 pb-4 pt-3 pr-12 text-left">
						<SheetTitle className="text-lg font-bold">{title}</SheetTitle>
					</SheetHeader>
					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
						{children}
					</div>
					{footer && (
						<SheetFooter className="shrink-0 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
							{footer}
						</SheetFooter>
					)}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger && <DialogTrigger render={trigger} />}
			<DialogContent className="max-h-[90dvh] max-w-lg gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b p-4 pr-12">
					<DialogTitle className="text-lg font-bold">{title}</DialogTitle>
				</DialogHeader>
				<div className="min-h-0 overflow-y-auto p-4">{children}</div>
				{footer && (
					<DialogFooter className="m-0 shrink-0 rounded-none px-4 py-3">
						{footer}
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
