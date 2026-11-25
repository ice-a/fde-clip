import { create } from "zustand";
import { bakeWithCyberChef, listOperations } from "../lib/cyberchef";
import { BUILTIN_RECIPES } from "../lib/builtinRecipes";
import type { Recipe, RecipeOp } from "../lib/types";

interface RecipeStore {
  operations: string[];
  recipes: Recipe[];
  active: number;
  ops: RecipeOp[];
  input: string;
  output: string;
  error: string;
  running: boolean;
  load: () => Promise<void>;
  select: (index: number) => void;
  setInput: (input: string) => void;
  setOps: (ops: RecipeOp[]) => void;
  run: () => Promise<void>;
}

export const useRecipe = create<RecipeStore>((set, get) => ({
  recipes: BUILTIN_RECIPES,
  active: 0,
  operations: [],
  ops: BUILTIN_RECIPES[0].ops.map((op) => ({ ...op })),
  input: "",
  output: "",
  error: "",
  running: false,
  load: async () => {
    try {
      const operations = await listOperations();
      set({ operations, error: "" });
    } catch (err) {
      set({ error: String(err) });
    }
  },
  select: (index) => {
    const recipe = get().recipes[index];
    if (!recipe) return;
    set({ active: index, ops: recipe.ops.map((op) => ({ ...op })), output: "", error: "" });
  },
  setInput: (input) => set({ input }),
  setOps: (ops) => set({ ops }),
  run: async () => {
    set({ running: true, error: "", output: "" });
    try {
      const output = await bakeWithCyberChef(get().input, get().ops);
      set({ output, running: false });
    } catch (err) {
      set({ error: String(err), running: false });
    }
  },
}));
