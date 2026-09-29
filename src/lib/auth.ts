import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { recipes, sessions, users } from "@/db/schema";
import { sampleRecipes } from "@/lib/sample-recipes";
import type { AppUser } from "@/lib/types";

const COOKIE_NAME = "morzsa_session";
const SESSION_DAYS = 365;

function tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export function toAppUser(user: typeof users.$inferSelect): AppUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        isGuest: !user.email,
    };
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const [result] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
        .limit(1);

    return result ?? null;
}

export async function createGuestSession() {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    // 1. Vendég felhasználó létrehozása
    const [user] = await db.insert(users).values({ name: "Vendég" }).returning();

    // 2. Munkamenet (session) beszúrása
    const [session] = await db.insert(sessions).values({
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt,
    }).returning();

    // 3. Minta receptek feltöltése
    if (sampleRecipes.length > 0) {
        await db.insert(recipes).values(
            sampleRecipes.map((recipe, index) => ({
                ...recipe,
                userId: user.id,
                isSample: true,
                createdAt: new Date(Date.now() - index * 60_000),
                updatedAt: new Date(Date.now() - index * 60_000),
            }))
        );
    }

    const result = { user, session };

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
    });

    return result;
}

export async function ensureSession() {
    return (await getSession()) ?? (await createGuestSession());
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(":");
    if (!salt || !expected) return false;
    try {
        const actualBuffer = scryptSync(password, salt, 64);
        const expectedBuffer = Buffer.from(expected, "hex");
        return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
        return false;
    }
}