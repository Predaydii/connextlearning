import { getAnnouncements } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

/** Announcements sent to the signed-in user personally (everyone's come with the page). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json([], { headers: { "Cache-Control": "private, no-store" } });
  const { targeted } = await getAnnouncements();
  // never send the recipient list to the browser
  const mine = targeted.filter((a) => a.userIds.includes(user.id)).map((a) => ({ ...a, userIds: undefined }));
  return Response.json(mine, { headers: { "Cache-Control": "private, no-store" } });
}
