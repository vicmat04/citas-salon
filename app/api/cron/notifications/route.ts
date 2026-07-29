import { runNotificationCron } from "@/lib/notifications/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get("authorization");
	if (!secret || authorization !== `Bearer ${secret}`) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	try {
		return Response.json(await runNotificationCron());
	} catch {
		return Response.json({ error: "cron_failed" }, { status: 500 });
	}
}
