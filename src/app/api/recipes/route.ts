import { db } from "@/db";
import { recipes } from "@/db/schema";
import { ensureSession } from "@/lib/auth";
import { parseRecipeInput } from "@/lib/recipe-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 5_000_000) {
      return Response.json({ error: "A fotó túl nagy. Próbálj kisebb képet feltölteni." }, { status: 413 });
    }

    const body = await request.json();
    const parsed = parseRecipeInput(body);
    if ("error" in parsed) return Response.json(parsed, { status: 400 });

    const { user } = await ensureSession();
    const [recipe] = await db.insert(recipes).values({
      ...parsed.value,
      userId: user.id,
      isSample: false,
    }).returning();

    return Response.json({ recipe }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Érvénytelen receptadatok." }, { status: 400 });
    console.error("Failed to save recipe", error);
    return Response.json({ error: "Nem sikerült elmenteni a receptet. Próbáld újra." }, { status: 500 });
  }
}
