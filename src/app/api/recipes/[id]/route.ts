import { db } from "@/db";
import { recipes } from "@/db/schema";
import { ensureSession } from "@/lib/auth";
import { parseRecipeInput } from "@/lib/recipe-validation";
import { and, eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) return Response.json({ error: "A recept nem található." }, { status: 404 });
    if (Number(request.headers.get("content-length") ?? 0) > 5_000_000) {
      return Response.json({ error: "A fotó túl nagy. Próbálj kisebb képet feltölteni." }, { status: 413 });
    }

    const body: unknown = await request.json();
    const { user } = await ensureSession();
    const where = and(eq(recipes.id, id), eq(recipes.userId, user.id));

    if (body && typeof body === "object" && "isFavorite" in body && typeof body.isFavorite === "boolean" && Object.keys(body).length === 1) {
      const [recipe] = await db.update(recipes).set({
        isFavorite: body.isFavorite,
        updatedAt: new Date(),
      }).where(where).returning();
      return recipe ? Response.json({ recipe }) : Response.json({ error: "A recept nem található." }, { status: 404 });
    }

    const parsed = parseRecipeInput(body);
    if ("error" in parsed) return Response.json(parsed, { status: 400 });
    const [recipe] = await db.update(recipes).set({
      ...parsed.value,
      isSample: false,
      updatedAt: new Date(),
    }).where(where).returning();

    return recipe ? Response.json({ recipe }) : Response.json({ error: "A recept nem található." }, { status: 404 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Érvénytelen receptadatok." }, { status: 400 });
    console.error("Failed to update recipe", error);
    return Response.json({ error: "Nem sikerült módosítani a receptet." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) return Response.json({ error: "A recept nem található." }, { status: 404 });
    const { user } = await ensureSession();
    const [deleted] = await db.delete(recipes).where(and(eq(recipes.id, id), eq(recipes.userId, user.id))).returning({ id: recipes.id });
    return deleted ? Response.json({ ok: true }) : Response.json({ error: "A recept nem található." }, { status: 404 });
  } catch (error) {
    console.error("Failed to delete recipe", error);
    return Response.json({ error: "Nem sikerült törölni a receptet." }, { status: 500 });
  }
}
