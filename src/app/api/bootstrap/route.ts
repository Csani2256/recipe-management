import { db } from "@/db";
import { recipes } from "@/db/schema";
import { ensureSession, toAppUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await ensureSession();
    const items = await db.select().from(recipes).where(eq(recipes.userId, user.id)).orderBy(desc(recipes.createdAt));
    return Response.json({ user: toAppUser(user), recipes: items }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to load recipes", error);
    return Response.json({ error: "A receptek most nem tölthetők be. Kérlek, próbáld újra." }, { status: 500 });
  }
}
