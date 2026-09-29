export const CATEGORIES = ["Reggeli", "Ebéd", "Vacsora", "Desszert", "Egyéb"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Recipe = {
  id: string;
  title: string;
  description: string;
  category: Category;
  prepTime: number | null;
  servings: number | null;
  ingredients: string;
  instructions: string;
  image: string | null;
  isFavorite: boolean;
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeInput = {
  title: string;
  description: string;
  category: Category;
  prepTime: number | null;
  servings: number | null;
  ingredients: string;
  instructions: string;
  image: string | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  isGuest: boolean;
};
