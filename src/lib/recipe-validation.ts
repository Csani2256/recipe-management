import { CATEGORIES, type Category, type RecipeInput } from "@/lib/types";

export function parseRecipeInput(input: unknown): { value: RecipeInput } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Hiányzó receptadatok." };
  const data = input as Record<string, unknown>;

  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 120) return { error: "Adj meg egy címet (legfeljebb 120 karakter)." };

  const description = typeof data.description === "string" ? data.description.trim() : "";
  const ingredients = typeof data.ingredients === "string" ? data.ingredients.trim() : "";
  const instructions = typeof data.instructions === "string" ? data.instructions.trim() : "";
  if (description.length > 500 || ingredients.length > 10_000 || instructions.length > 20_000) {
    return { error: "A recept szövege túl hosszú." };
  }

  const category: Category = CATEGORIES.includes(data.category as Category) ? data.category as Category : "Egyéb";
  const prepTime = data.prepTime === null || data.prepTime === "" || data.prepTime === undefined ? null : Number(data.prepTime);
  const servings = data.servings === null || data.servings === "" || data.servings === undefined ? null : Number(data.servings);
  if (prepTime !== null && (!Number.isInteger(prepTime) || prepTime < 1 || prepTime > 1440)) {
    return { error: "Az elkészítési idő 1 és 1440 perc között lehet." };
  }
  if (servings !== null && (!Number.isInteger(servings) || servings < 1 || servings > 100)) {
    return { error: "Az adagok száma 1 és 100 között lehet." };
  }

  const image = data.image === null || data.image === undefined ? null : data.image;
  if (image !== null) {
    if (typeof image !== "string" || image.length > 4_500_000 || !(/^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/.test(image) || /^\/images\/[a-z0-9-]+\.jpg$/.test(image))) {
      return { error: "A fotó túl nagy vagy nem támogatott. Válassz JPG, PNG vagy WEBP képet." };
    }
  }

  return { value: { title, description, category, prepTime, servings, ingredients, instructions, image } };
}
