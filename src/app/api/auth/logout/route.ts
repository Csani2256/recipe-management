import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { clearSessionCookie, createGuestSession, getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const current = await getSession();
    if (current) {
      if (current.user.email) {
        await db.delete(sessions).where(eq(sessions.id, current.session.id));
      } else {
        await db.delete(users).where(eq(users.id, current.user.id));
      }
    }
    await clearSessionCookie();
    await createGuestSession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Logout failed", error);
    return Response.json({ error: "Nem sikerült kijelentkezni." }, { status: 500 });
  }
}
