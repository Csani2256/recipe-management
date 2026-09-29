import { db } from "@/db";
import { recipes, sessions, users } from "@/db/schema";
import { ensureSession, toAppUser, verifyPassword } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return Response.json({ error: "Add meg az e-mail-címed és a jelszavad." }, { status: 400 });

    const [account] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!account?.passwordHash || !verifyPassword(password, account.passwordHash)) {
      return Response.json({ error: "Hibás e-mail-cím vagy jelszó." }, { status: 401 });
    }

    const { user: currentUser, session } = await ensureSession();
    if (currentUser.id !== account.id) {
      await db.transaction(async (tx) => {
        if (!currentUser.email) {
          await tx.update(recipes).set({ userId: account.id }).where(and(eq(recipes.userId, currentUser.id), eq(recipes.isSample, false)));
        }
        await tx.update(sessions).set({ userId: account.id }).where(eq(sessions.id, session.id));
        if (!currentUser.email) await tx.delete(users).where(eq(users.id, currentUser.id));
      });
    }

    return Response.json({ user: toAppUser(account) });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Érvénytelen adatok." }, { status: 400 });
    console.error("Login failed", error);
    return Response.json({ error: "Nem sikerült bejelentkezni. Próbáld újra." }, { status: 500 });
  }
}
