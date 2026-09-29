import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSession, hashPassword, toAppUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2 || name.length > 60) return Response.json({ error: "Adj meg egy nevet (2–60 karakter)." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Adj meg egy érvényes e-mail-címet." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return Response.json({ error: "A jelszó legalább 8 karakter legyen." }, { status: 400 });

    const { user } = await ensureSession();
    if (user.email) return Response.json({ error: "Már be vagy jelentkezve." }, { status: 400 });

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return Response.json({ error: "Ezzel az e-mail-címmel már van fiók. Jelentkezz be!" }, { status: 409 });

    const [updated] = await db.update(users).set({ name, email, passwordHash: hashPassword(password) }).where(eq(users.id, user.id)).returning();
    return Response.json({ user: toAppUser(updated) });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Érvénytelen adatok." }, { status: 400 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Ezzel az e-mail-címmel már van fiók." }, { status: 409 });
    }
    console.error("Signup failed", error);
    return Response.json({ error: "Nem sikerült létrehozni a fiókot. Próbáld újra." }, { status: 500 });
  }
}
